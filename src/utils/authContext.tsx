import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  ClerkProvider,
  useUser,
  useAuth as useClerkAuth,
  useSignIn,
  useSignUp,
  useClerk,
  AuthenticateWithRedirectCallback,
} from '@clerk/clerk-react';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: 'google' | 'apple' | 'email';
  providerId?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isClerkConfigured: boolean;
  loginWithGoogle: (mode?: 'signin' | 'signup') => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  loginWithApple: () => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signupWithEmail: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ success: boolean; needsVerification?: boolean; error?: string }>;
  verifyEmailCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to extract the clean Clerk Publishable Key (pk_test_... or pk_live_...)
// Handles raw strings, Next.js prefixes, multi-variable env strings, and whitespace
export function getClerkPublishableKey(): string {
  const candidates: Array<string | undefined | null> = [
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)
      : undefined,
    typeof import.meta !== 'undefined' && import.meta.env
      ? ((import.meta.env as unknown as Record<string, string>).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
      : undefined,
    typeof window !== 'undefined'
      ? (window as unknown as { __CLERK_PUBLISHABLE_KEY__?: string }).__CLERK_PUBLISHABLE_KEY__
      : undefined,
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_CLERK_PUBLISHABLE_KEY
      : undefined,
    typeof process !== 'undefined' && process.env
      ? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
      : undefined,
    typeof process !== 'undefined' && process.env
      ? process.env.CLERK_PUBLISHABLE_KEY
      : undefined,
    'pk_test_d2VsbC10cm91dC0zMDE4LmNsZXJrLmFjY291bnRzLmRldiQ',
  ];

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

// Inner provider that uses Clerk hooks when ClerkProvider is active
const ClerkAuthInnerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user: clerkUser, isLoaded: isUserLoaded, isSignedIn } = useUser();
  const { isLoaded: isAuthLoaded } = useClerkAuth();
  const { signIn, isLoaded: isSignInLoaded, setActive: setSignInActive } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded, setActive: setSignUpActive } = useSignUp();
  const { signOut } = useClerk();

  const [error, setError] = useState<string | null>(null);

  // Map real Clerk user to verified AuthUser
  const user: AuthUser | null = useMemo(() => {
    if (!isSignedIn || !clerkUser) return null;

    const isGoogle = clerkUser.externalAccounts?.some((acc) =>
      acc.provider?.toLowerCase().includes('google')
    );
    const isApple = clerkUser.externalAccounts?.some((acc) =>
      acc.provider?.toLowerCase().includes('apple')
    );
    const provider: 'google' | 'apple' | 'email' = isGoogle
      ? 'google'
      : isApple
      ? 'apple'
      : 'email';

    const primaryEmail =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      '';

    const displayName =
      clerkUser.fullName ||
      clerkUser.firstName ||
      clerkUser.username ||
      (primaryEmail ? primaryEmail.split('@')[0] : 'User');

    return {
      id: clerkUser.id,
      email: primaryEmail,
      name: displayName,
      avatar: clerkUser.imageUrl,
      provider,
      providerId: clerkUser.externalAccounts?.[0]?.providerUserId,
      createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : new Date().toISOString(),
      lastLoginAt: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt).toISOString() : new Date().toISOString(),
    };
  }, [isSignedIn, clerkUser]);

  // Real Clerk Google OAuth flow
  const loginWithGoogle = useCallback(
    async (mode: 'signin' | 'signup' = 'signup') => {
      setError(null);
      if (!isSignInLoaded || !signIn || !isSignUpLoaded || !signUp) {
        const err = 'Authentication service is initializing. Please try again.';
        setError(err);
        return { success: false, error: err };
      }

      const redirectUrl = `${window.location.origin}/sso-callback`;
      const redirectUrlComplete = `${window.location.origin}/`;

      // Detect if running inside an iframe or embedded preview
      const isEmbedded =
        typeof window !== 'undefined' &&
        (window.self !== window.top || window.parent !== window);

      // 1. Direct browser window / deployed site (not running in an iframe):
      // Use the standard Clerk top-level redirect flow
      if (!isEmbedded) {
        try {
          if (mode === 'signup') {
            try {
              await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete,
              });
              return { success: true };
            } catch (signUpErr) {
              // If account already exists, redirect with signIn instead
              console.log('Clerk signUp redirect redirected or failed, trying signIn:', signUpErr);
              await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete,
              });
              return { success: true };
            }
          } else {
            try {
              await signIn.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete,
              });
              return { success: true };
            } catch (signInErr) {
              // If account does not exist, redirect with signUp instead
              console.log('Clerk signIn redirect redirected or failed, trying signUp:', signInErr);
              await signUp.authenticateWithRedirect({
                strategy: 'oauth_google',
                redirectUrl,
                redirectUrlComplete,
              });
              return { success: true };
            }
          }
        } catch (err: unknown) {
          const clerkErr = err as {
            errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
            message?: string;
          };
          let msg =
            clerkErr?.errors?.[0]?.longMessage ||
            clerkErr?.errors?.[0]?.message ||
            clerkErr?.message ||
            'Google authentication failed.';

          const lower = msg.toLowerCase();
          if (
            lower.includes('not configured') ||
            lower.includes('not found') ||
            lower.includes('strategy') ||
            lower.includes('credentials')
          ) {
            msg =
              'Google authentication is not enabled in your Clerk dashboard yet. Please enable Google in Social Connections.';
          } else if (
            lower.includes('cancel') ||
            lower.includes('abort') ||
            lower.includes('closed')
          ) {
            msg = 'Google sign-in was cancelled.';
          }
          setError(msg);
          return { success: false, error: msg };
        }
      }

      // 2. Embedded preview / iframe:
      // In embedded previews, Google blocks authentication inside iframes.
      // We retrieve Clerk's OAuth redirection URL and open it in a dedicated popup/tab.
      try {
        let targetUrl: string | null = null;

        if (mode === 'signup') {
          try {
            const res = await signUp.create({
              strategy: 'oauth_google',
              redirectUrl,
              actionCompleteRedirectUrl: redirectUrlComplete,
            });
            const extUrl = res.verifications?.externalAccount?.externalVerificationRedirectURL;
            if (extUrl) targetUrl = extUrl.toString();
          } catch {
            // User might already exist, fallback to signIn
            const res = await signIn.create({
              strategy: 'oauth_google',
              redirectUrl,
              actionCompleteRedirectUrl: redirectUrlComplete,
            });
            const extUrl = res.firstFactorVerification?.externalVerificationRedirectURL;
            if (extUrl) targetUrl = extUrl.toString();
          }
        } else {
          try {
            const res = await signIn.create({
              strategy: 'oauth_google',
              redirectUrl,
              actionCompleteRedirectUrl: redirectUrlComplete,
            });
            const extUrl = res.firstFactorVerification?.externalVerificationRedirectURL;
            if (extUrl) targetUrl = extUrl.toString();
          } catch {
            // User might not exist yet, fallback to signUp
            const res = await signUp.create({
              strategy: 'oauth_google',
              redirectUrl,
              actionCompleteRedirectUrl: redirectUrlComplete,
            });
            const extUrl = res.verifications?.externalAccount?.externalVerificationRedirectURL;
            if (extUrl) targetUrl = extUrl.toString();
          }
        }

        if (targetUrl) {
          const width = 520;
          const height = 650;
          const left = Math.max(0, window.screenX + (window.outerWidth - width) / 2);
          const top = Math.max(0, window.screenY + (window.outerHeight - height) / 2);

          const popup = window.open(
            targetUrl,
            'clerk_google_oauth',
            `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
          );

          if (!popup || popup.closed) {
            const err =
              'Google Sign-In popup was blocked by your browser. Please allow popups or open the app directly in your browser.';
            setError(err);
            return { success: false, error: err };
          }

          return { success: true };
        }

        // If targetUrl could not be extracted directly, use Clerk's authenticateWithPopup
        if (mode === 'signup') {
          try {
            await signUp.authenticateWithPopup({
              strategy: 'oauth_google',
              popup: null,
              redirectUrl,
              redirectUrlComplete,
            });
            if (signUp.status === 'complete' && signUp.createdSessionId) {
              await setSignUpActive({ session: signUp.createdSessionId });
            }
          } catch {
            await signIn.authenticateWithPopup({
              strategy: 'oauth_google',
              popup: null,
              redirectUrl,
              redirectUrlComplete,
            });
            if (signIn.status === 'complete' && signIn.createdSessionId) {
              await setSignInActive({ session: signIn.createdSessionId });
            }
          }
        } else {
          try {
            await signIn.authenticateWithPopup({
              strategy: 'oauth_google',
              popup: null,
              redirectUrl,
              redirectUrlComplete,
            });
            if (signIn.status === 'complete' && signIn.createdSessionId) {
              await setSignInActive({ session: signIn.createdSessionId });
            }
          } catch {
            await signUp.authenticateWithPopup({
              strategy: 'oauth_google',
              popup: null,
              redirectUrl,
              redirectUrlComplete,
            });
            if (signUp.status === 'complete' && signUp.createdSessionId) {
              await setSignUpActive({ session: signUp.createdSessionId });
            }
          }
        }

        return { success: true };
      } catch (err: unknown) {
        const clerkErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        let msg =
          clerkErr?.errors?.[0]?.longMessage ||
          clerkErr?.errors?.[0]?.message ||
          clerkErr?.message ||
          'Google authentication failed.';

        const lower = msg.toLowerCase();
        if (
          lower.includes('cancel') ||
          lower.includes('abort') ||
          lower.includes('closed')
        ) {
          msg = 'Google sign-in was cancelled.';
        } else if (
          lower.includes('not configured') ||
          lower.includes('not found') ||
          lower.includes('strategy') ||
          lower.includes('credentials')
        ) {
          msg =
            'Google authentication is not enabled in your Clerk dashboard yet. Please enable Google in Social Connections.';
        }
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [isSignInLoaded, signIn, isSignUpLoaded, signUp, setSignInActive, setSignUpActive]
  );

  // Apple is a visual showcase placeholder
  const loginWithApple = useCallback(async () => {
    const msg = 'Apple sign-in is currently a visual placeholder and not enabled.';
    setError(msg);
    return { success: false, error: msg };
  }, []);

  // Real Clerk Email Signin
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      setError(null);
      if (!isSignInLoaded || !signIn) {
        const err = 'Authentication service is initializing. Please try again.';
        setError(err);
        return { success: false, error: err };
      }

      try {
        const res = await signIn.create({
          identifier: email,
          password: password,
        });

        if (res.status === 'complete' && res.createdSessionId) {
          await setSignInActive({ session: res.createdSessionId });
          return { success: true };
        } else {
          const msg = 'Additional authentication step required.';
          setError(msg);
          return { success: false, error: msg };
        }
      } catch (err: unknown) {
        const clerkErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const msg =
          clerkErr?.errors?.[0]?.longMessage ||
          clerkErr?.errors?.[0]?.message ||
          clerkErr?.message ||
          'Invalid email or password.';
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [isSignInLoaded, signIn, setSignInActive]
  );

  // Real Clerk Email Signup
  const signupWithEmail = useCallback(
    async (email: string, password: string, name?: string) => {
      setError(null);
      if (!isSignUpLoaded || !signUp) {
        const err = 'Authentication service is initializing. Please try again.';
        setError(err);
        return { success: false, error: err };
      }

      try {
        const trimmedName = name?.trim() || '';
        const nameParts = trimmedName.split(/\s+/);
        const firstName = nameParts[0] || undefined;
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined;

        const res = await signUp.create({
          emailAddress: email,
          password: password,
          firstName,
          lastName,
        });

        if (res.status === 'complete' && res.createdSessionId) {
          await setSignUpActive({ session: res.createdSessionId });
          return { success: true, needsVerification: false };
        } else if (res.status === 'missing_requirements') {
          if (res.unverifiedFields?.includes('email_address')) {
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            return { success: true, needsVerification: true };
          }
          return { success: true, needsVerification: false };
        }
        return { success: true, needsVerification: false };
      } catch (err: unknown) {
        const clerkErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const msg =
          clerkErr?.errors?.[0]?.longMessage ||
          clerkErr?.errors?.[0]?.message ||
          clerkErr?.message ||
          'Failed to create account.';
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [isSignUpLoaded, signUp, setSignUpActive]
  );

  // Verify email code for Clerk email verification flow
  const verifyEmailCode = useCallback(
    async (code: string) => {
      setError(null);
      if (!isSignUpLoaded || !signUp) {
        const err = 'Verification service is initializing. Please try again.';
        setError(err);
        return { success: false, error: err };
      }

      try {
        const res = await signUp.attemptEmailAddressVerification({ code: code.trim() });
        if (res.status === 'complete' && res.createdSessionId) {
          await setSignUpActive({ session: res.createdSessionId });
          return { success: true };
        } else {
          const msg = 'Verification not complete. Please check the code.';
          setError(msg);
          return { success: false, error: msg };
        }
      } catch (err: unknown) {
        const clerkErr = err as {
          errors?: Array<{ code?: string; message?: string; longMessage?: string }>;
          message?: string;
        };
        const msg =
          clerkErr?.errors?.[0]?.longMessage ||
          clerkErr?.errors?.[0]?.message ||
          clerkErr?.message ||
          'Invalid verification code.';
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [isSignUpLoaded, signUp, setSignUpActive]
  );

  // Real Clerk Logout
  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Clerk sign-out error:', err);
    }
  }, [signOut]);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(isSignedIn && clerkUser),
        isLoading: !isUserLoaded || !isAuthLoaded,
        error,
        isClerkConfigured: true,
        loginWithGoogle,
        loginWithApple,
        loginWithEmail,
        signupWithEmail,
        verifyEmailCode,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Fallback provider when Clerk Publishable Key is genuinely not configured
const ClerkUnconfiguredProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [error, setError] = useState<string | null>(null);

  const missingKeyError =
    'Clerk Publishable Key is not configured. Please add VITE_CLERK_PUBLISHABLE_KEY to your environment variables.';

  const loginWithGoogle = useCallback(async (_mode?: 'signin' | 'signup') => {
    setError(missingKeyError);
    return { success: false, error: missingKeyError };
  }, [missingKeyError]);

  const loginWithApple = useCallback(async () => {
    setError(missingKeyError);
    return { success: false, error: missingKeyError };
  }, [missingKeyError]);

  const loginWithEmail = useCallback(async () => {
    setError(missingKeyError);
    return { success: false, error: missingKeyError };
  }, [missingKeyError]);

  const signupWithEmail = useCallback(async () => {
    setError(missingKeyError);
    return { success: false, error: missingKeyError };
  }, [missingKeyError]);

  const verifyEmailCode = useCallback(async () => {
    setError(missingKeyError);
    return { success: false, error: missingKeyError };
  }, [missingKeyError]);

  const logout = useCallback(async () => {}, []);
  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error,
        isClerkConfigured: false,
        loginWithGoogle,
        loginWithApple,
        loginWithEmail,
        signupWithEmail,
        verifyEmailCode,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [publishableKey, setPublishableKey] = useState<string>(() => getClerkPublishableKey());

  useEffect(() => {
    if (!publishableKey) {
      // Secondary check against server proxy endpoint in case client environment missed injection
      fetch('/api/auth/config')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.publishableKey) {
            setPublishableKey(data.publishableKey);
          }
        })
        .catch(() => {});
    }
  }, [publishableKey]);

  const isConfigured = Boolean(
    publishableKey &&
    (publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_'))
  );

  if (!isConfigured) {
    return <ClerkUnconfiguredProvider>{children}</ClerkUnconfiguredProvider>;
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey}
      signInForceRedirectUrl="/"
      signUpForceRedirectUrl="/"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignInUrl="/"
      afterSignUpUrl="/"
      routerPush={(to) => {
        if (typeof window !== 'undefined') {
          window.location.href = to;
        }
      }}
      routerReplace={(to) => {
        if (typeof window !== 'undefined') {
          window.location.replace(to);
        }
      }}
    >
      <ClerkAuthInnerProvider>{children}</ClerkAuthInnerProvider>
    </ClerkProvider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export { AuthenticateWithRedirectCallback };
