import https from 'https';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Cached JWKS public keys: kid -> KeyObject
const jwksKeyCache = new Map<string, crypto.KeyObject>();
let lastJwksFetch = 0;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const CLERK_JWKS_URL =
  process.env.CLERK_JWKS_URL ||
  'https://well-trout-3018.clerk.accounts.dev/.well-known/jwks.json';

const FALLBACK_JWT_KEY = process.env.CLERK_JWT_KEY || '';

// Fetch and cache Clerk's public keys
export async function refreshJwksKeys(): Promise<void> {
  const now = Date.now();
  if (jwksKeyCache.size > 0 && now - lastJwksFetch < JWKS_CACHE_TTL_MS) {
    return;
  }

  try {
    const rawData = await new Promise<string>((resolve, reject) => {
      const req = https.get(CLERK_JWKS_URL, { timeout: 8000 }, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
          return reject(new Error(`JWKS fetch failed with status ${res.statusCode}`));
        }
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('JWKS fetch timed out'));
      });
    });

    const parsed = JSON.parse(rawData);
    if (parsed && Array.isArray(parsed.keys)) {
      for (const jwk of parsed.keys) {
        if (jwk.kid && jwk.kty === 'RSA') {
          try {
            const pubKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
            jwksKeyCache.set(jwk.kid, pubKey);
          } catch (e) {
            console.error('Failed to parse JWK key:', e);
          }
        }
      }
      lastJwksFetch = now;
    }
  } catch (err) {
    console.warn('Unable to refresh JWKS from Clerk URL, attempting fallback key:', err);
    if (FALLBACK_JWT_KEY && jwksKeyCache.size === 0) {
      try {
        const pubKey = crypto.createPublicKey(FALLBACK_JWT_KEY);
        jwksKeyCache.set('default', pubKey);
      } catch (e) {
        console.error('Failed to parse fallback public key:', e);
      }
    }
  }
}

export interface VerifiedClerkSession {
  userId: string;
  email?: string;
  sessionId?: string;
}

/**
 * Cryptographically verifies incoming Clerk JWT token
 */
export async function verifyClerkToken(
  token: string
): Promise<VerifiedClerkSession | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;

  try {
    // 1. Decode header and payload
    const headerStr = Buffer.from(parts[0], 'base64url').toString('utf8');
    const payloadStr = Buffer.from(parts[1], 'base64url').toString('utf8');

    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);

    if (!payload || !payload.sub || typeof payload.sub !== 'string') {
      return null;
    }

    // 2. Validate expiration (with 120-second clock skew allowance for cross-device mobile/laptop time drifts)
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && typeof payload.exp === 'number') {
      if (payload.exp + 120 < nowSec) {
        console.warn('Clerk token expired:', { exp: payload.exp, now: nowSec });
        return null;
      }
    }

    // 3. Ensure JWKS keys are available
    await refreshJwksKeys();

    const kid = header.kid;
    let pubKey = kid ? jwksKeyCache.get(kid) : undefined;
    if (!pubKey) {
      // If kid wasn't in cache, try refreshing once
      await refreshJwksKeys();
      pubKey = kid ? jwksKeyCache.get(kid) : undefined;
    }

    // If still no key for kid, try any cached key or fallback
    if (!pubKey && jwksKeyCache.size > 0) {
      pubKey = jwksKeyCache.values().next().value;
    }

    if (!pubKey) {
      console.error('No public key available to verify Clerk token signature');
      return null;
    }

    // 4. Verify RSA-SHA256 signature
    const verifyData = Buffer.from(parts[0] + '.' + parts[1]);
    const verifySig = Buffer.from(parts[2], 'base64url');

    const isValid = crypto.verify('RSA-SHA256', verifyData, pubKey, verifySig);
    if (!isValid) {
      console.warn('Invalid signature on Clerk token');
      return null;
    }

    return {
      userId: payload.sub,
      email: payload.email || payload.primary_email || '',
      sessionId: payload.sid || '',
    };
  } catch (err) {
    console.error('Error verifying Clerk token:', err);
    return null;
  }
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      clerkUser?: VerifiedClerkSession;
    }
  }
}

/**
 * Express Middleware: Require valid Clerk Authentication
 */
export async function requireClerkAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication token missing. Please sign in to HabitOS.',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  const verified = await verifyClerkToken(token);

  if (!verified || !verified.userId) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication session. Please re-authenticate.',
    });
    return;
  }

  req.clerkUser = verified;
  next();
}
