import express from 'express';
import { createServer as createViteServer } from 'vite';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireClerkAuth, refreshJwksKeys } from './server/clerkAuth';
import { getUserData, syncUserData, waitForUserUpdate } from './server/cloudStore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function extractPublishableKey(...candidates: Array<string | undefined>): string {
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'string') continue;
    const match = candidate.match(/(pk_test_[^\s"';\n]+|pk_live_[^\s"';\n]+)/);
    if (match && match[1]) {
      return match[1];
    }
    const trimmed = candidate.trim();
    if (trimmed.startsWith('pk_test_') || trimmed.startsWith('pk_live_')) {
      return trimmed;
    }
  }
  return '';
}

async function startServer() {
  // Pre-fetch Clerk JWKS keys asynchronously so first user requests are fast
  refreshJwksKeys().catch((err) => console.warn('Background JWKS pre-fetch notice:', err));

  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Basic middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Public Auth Config endpoint
  app.get('/api/auth/config', (_req, res) => {
    const publishableKey = extractPublishableKey(
      process.env.VITE_CLERK_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_PUBLISHABLE_KEY,
      'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ'
    );
    res.json({
      publishableKey,
      frontendApi: 'https://well-trout-3018.clerk.accounts.dev',
      configured: Boolean(publishableKey),
    });
  });

  // Auth status endpoint
  app.get('/api/auth/status', (_req, res) => {
    const publishableKey = extractPublishableKey(
      process.env.VITE_CLERK_PUBLISHABLE_KEY,
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      process.env.CLERK_PUBLISHABLE_KEY,
      'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ'
    );
    res.json({
      authProvider: 'clerk',
      configured: Boolean(publishableKey),
      frontendApi: 'https://well-trout-3018.clerk.accounts.dev',
      timestamp: new Date().toISOString(),
    });
  });

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ==============================================================================
  // SECURE CROSS-DEVICE CLOUD DATA SYNCHRONIZATION API
  // Uses authenticated Clerk User ID as isolated data partition key
  // ==============================================================================

  // 1. Fetch authenticated user's full cloud data
  app.get('/api/user/data', requireClerkAuth, async (req, res) => {
    try {
      const userId = req.clerkUser!.userId;
      const data = await getUserData(userId);
      res.json({
        success: true,
        data,
        version: data?.version || 0,
        userId,
      });
    } catch (err) {
      console.error('Error fetching user cloud data:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch user data' });
    }
  });

  // 2. Synchronize and merge user changes to cloud store
  app.post('/api/user/sync', requireClerkAuth, async (req, res) => {
    try {
      const userId = req.clerkUser!.userId;
      const payload = req.body;
      const updated = await syncUserData(userId, payload);
      res.json({
        success: true,
        data: updated,
        version: updated.version,
      });
    } catch (err) {
      console.error('Error saving user sync to cloud:', err);
      res.status(500).json({ success: false, error: 'Failed to save changes to cloud' });
    }
  });

  // 3. Real-time update polling across active devices (Laptop, Phone, Tablet)
  app.get('/api/user/poll', requireClerkAuth, async (req, res) => {
    try {
      const userId = req.clerkUser!.userId;
      const sinceVersion = parseInt(req.query.sinceVersion as string, 10) || 0;
      const result = await waitForUserUpdate(userId, sinceVersion, 20000);
      res.json({
        success: true,
        hasUpdate: result.hasUpdate,
        version: result.version,
        data: result.data || null,
      });
    } catch (err) {
      console.error('Error polling user updates:', err);
      res.status(500).json({ success: false, error: 'Failed to poll updates' });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running in ${isProduction ? 'production' : 'development'} on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
