import React, { useState, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  Check,
  Mail,
  Lock,
  Sparkles,
  AlertCircle,
  LogOut,
  User as UserIcon,
  ShieldCheck,
} from 'lucide-react';
import newBackgroundImage from '../assets/sky-mountains-black-clouds-wallpaper-preview.jpg';
import { useAuth, AuthUser } from '../utils/authContext';

interface JoinLiquidGlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (user: AuthUser | string) => void;
  isFullPage?: boolean;
}

export const JoinLiquidGlassModal: React.FC<JoinLiquidGlassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  isFullPage = false,
}) => {
  const {
    user,
    isAuthenticated,
    isClerkConfigured,
    loginWithGoogle,
    loginWithEmail,
    signupWithEmail,
    verifyEmailCode,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState<'Google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle ESC key to close modal (only if not full-page protected screen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isFullPage) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      setMessage(null);
      setErrorMessage(null);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, isFullPage]);

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (!email || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    if (mode === 'signup') {
      const result = await signupWithEmail(email, password, name);
      setIsLoading(false);
      if (result.success) {
        if (result.needsVerification) {
          setPendingVerification(true);
          setMessage('A verification code has been sent to your email. Please enter it below.');
        } else {
          setMessage('Account created successfully! Loading HabitOS...');
          if (onSuccess) onSuccess(name || email.split('@')[0]);
          if (!isFullPage) {
            setTimeout(() => onClose(), 800);
          }
        }
      } else {
        setErrorMessage(result.error || 'Failed to create account.');
      }
    } else {
      const result = await loginWithEmail(email, password);
      setIsLoading(false);
      if (result.success) {
        setMessage('Successfully signed in! Loading HabitOS...');
        if (onSuccess) onSuccess(email.split('@')[0]);
        if (!isFullPage) {
          setTimeout(() => onClose(), 800);
        }
      } else {
        setErrorMessage(result.error || 'Invalid email or password.');
      }
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setMessage(null);

    if (!verificationCode) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    const result = await verifyEmailCode(verificationCode);
    setIsLoading(false);
    if (result.success) {
      setMessage('Email verified! Loading HabitOS...');
      if (onSuccess) onSuccess(name || email.split('@')[0]);
      if (!isFullPage) {
        setTimeout(() => onClose(), 800);
      }
    } else {
      setErrorMessage(result.error || 'Invalid verification code.');
    }
  };

  const handleSocialAuth = async (provider: 'Google' | 'Apple') => {
    setErrorMessage(null);
    setMessage(null);

    if (provider === 'Apple') {
      setMessage('Apple sign-in: Coming soon');
      return;
    }

    setIsSocialLoading('Google');

    try {
      const result = await loginWithGoogle(mode);
      setIsSocialLoading(null);

      if (result.success) {
        setMessage('Connecting to Google through Clerk...');
      } else if (result.error) {
        if (
          result.error.toLowerCase().includes('cancel') ||
          result.error.toLowerCase().includes('abort') ||
          result.error.toLowerCase().includes('closed')
        ) {
          setErrorMessage(null);
        } else {
          setErrorMessage(result.error);
        }
      }
    } catch (err: unknown) {
      setIsSocialLoading(null);
      const msg =
        err instanceof Error
          ? err.message
          : 'Google authentication encountered an error.';
      setErrorMessage(msg);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await logout();
    setIsLoading(false);
    setMessage('Signed out from Clerk.');
    setTimeout(() => {
      setMessage(null);
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6"
    >
      {/* Background Wallpaper Container with misty mountain atmospheric depth */}
      <div
        className="fixed inset-0 overflow-hidden pointer-events-auto"
        onClick={() => {
          if (!isFullPage) onClose();
        }}
        title={!isFullPage ? 'Click outside to close' : undefined}
      >
        <div className="absolute inset-0 bg-[#0f1115]">
          <img
            src={newBackgroundImage}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                '/sky-mountains-black-clouds-wallpaper-preview.jpg';
            }}
            alt="Misty mountain clouds wallpaper"
            className="w-full h-full object-cover object-center contrast-110 brightness-95 transition-opacity duration-700"
          />
          {/* Atmospheric misty depth fog overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/40 pointer-events-none" />
          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/50 pointer-events-none" />
        </div>
      </div>

      {/* Top Navigation Overlay Header */}
      <header className="fixed top-0 inset-x-0 z-10 px-6 sm:px-10 py-5 flex items-center justify-between pointer-events-auto">
        {/* Brand mark with website's exact HoS editorial serif logo */}
        <div
          className="flex items-center gap-2.5"
          style={{
            height: '47px',
            width: '106.125px',
          }}
        >
          <div className="w-[34px] h-[34px] rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-sm shadow-md shrink-0 border border-white/20">
            <svg viewBox="0 0 24 24" className="w-[24px] h-[24px] fill-white">
              <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 3.2L18.5 9 12 12.8 5.5 9 12 5.2zm-7 5.3l6 3.5v6.8l-6-3.4v-6.9zm14 6.9l-6 3.4v-6.8l6-3.5v6.9z" />
            </svg>
          </div>
          <div className="flex flex-col items-center leading-none">
            <span
              className="font-bold text-white drop-shadow-md whitespace-nowrap no-underline leading-none"
              style={{
                fontFamily: '"Bodoni Moda", "Playfair Display", "DM Serif Display", "Times New Roman", serif',
                letterSpacing: '-0.02em',
                width: '62.3875px',
                fontSize: '32px',
              }}
            >
              HoS
            </span>
            <span
              className="text-[5.5px] sm:text-[6px] font-bold text-white/85 tracking-[0.03em] uppercase leading-none mt-1 select-none text-center whitespace-nowrap w-full block drop-shadow-xs"
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                height: '7px',
              }}
            >
              YOUR OWN TRACKER
            </span>
          </div>
        </div>

        {/* Close button if rendered as a modal overlay on top of dashboard */}
        {!isFullPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/80 hover:text-white transition-all cursor-pointer backdrop-blur-md"
            title="Close dialog"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </header>

      {/* Main Glass Widget Centerpiece */}
      <div className="relative z-10 w-full max-w-[430px] my-auto pointer-events-auto">
        {/* Liquid Glass Widget Card - High Transparency showcasing blurry mountain behind */}
        <div
          className="relative rounded-[38px] p-7 sm:p-9 border shadow-2xl transition-all duration-300 overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 255, 255, 0.14) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.02) 100%)',
            backdropFilter: 'blur(12px) saturate(185%) contrast(108%) brightness(1.05)',
            WebkitBackdropFilter: 'blur(12px) saturate(185%) contrast(108%) brightness(1.05)',
            borderColor: 'rgba(255, 255, 255, 0.38)',
            boxShadow: `
              0 30px 60px -12px rgba(0, 0, 0, 0.55),
              0 12px 28px -4px rgba(0, 0, 0, 0.35),
              inset 0 1.5px 2px 0 rgba(255, 255, 255, 0.55),
              inset 0 -1.5px 2px 0 rgba(0, 0, 0, 0.25)
            `,
          }}
        >
          {/* Top Liquid Specular Glint & Light Caustics */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/30 via-white/5 to-transparent pointer-events-none" />
          <div className="absolute top-2 inset-x-12 h-1 rounded-full bg-white blur-[0.6px] pointer-events-none opacity-85" />
          {/* Bottom curvature refraction */}
          <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />

          {/* Missing Clerk configuration banner (hidden when key is configured) */}
          {!isClerkConfigured && (
            <div className="relative z-10 mb-4 p-2.5 rounded-2xl bg-amber-500/20 backdrop-blur-md border border-amber-400/40 text-amber-200 text-xs font-medium flex items-center gap-2 animate-in fade-in shadow-md">
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-300" />
              <span className="leading-tight text-[11px]">
                Clerk key not configured. Please add <code className="bg-black/30 px-1 py-0.5 rounded font-mono text-[10px]">VITE_CLERK_PUBLISHABLE_KEY</code> to your environment variables.
              </span>
            </div>
          )}

          {/* If already authenticated via Clerk, show verified Clerk account state */}
          {isAuthenticated && user ? (
            <div className="relative z-10 text-center py-2 space-y-5 animate-in fade-in duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center overflow-hidden shadow-lg backdrop-blur-md">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-8 h-8 text-white" />
                )}
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight drop-shadow-md">
                  {user.name}
                </h2>
                <p className="text-xs text-white/80 font-medium mt-1 truncate max-w-[280px] mx-auto drop-shadow-sm">
                  {user.email}
                </p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold text-white/90 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Verified Clerk {user.provider.toUpperCase()} Account
                </div>
                <p className="text-[10px] text-white/50 font-mono mt-1">
                  ID: {user.id.slice(0, 14)}...
                </p>
              </div>

              {message && (
                <div className="p-2.5 rounded-2xl bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 text-emerald-100 text-xs font-bold flex items-center gap-2 shadow-md">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              <div className="pt-2 space-y-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl hover:bg-white active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.9)',
                  }}
                >
                  Continue to Tracker
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="w-full py-2.5 px-5 rounded-2xl text-xs font-semibold text-white/90 hover:text-white bg-black/25 hover:bg-black/40 border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Heading */}
              <div className="relative z-10 text-center mb-6">
                <h2 className="text-xl sm:text-[22px] font-extrabold tracking-tight text-white leading-snug drop-shadow-md">
                  {mode === 'signin' ? 'Sign in with email' : 'Create your account'}
                </h2>
                <p className="text-xs text-white/80 font-medium mt-1.5 leading-relaxed max-w-[280px] mx-auto drop-shadow-sm">
                  Make a new doc to bring your words, data, and teams together. For free
                </p>
              </div>

              {/* Feedback Success Message */}
              {message && (
                <div className="relative z-10 mb-4 p-2.5 rounded-2xl bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 text-emerald-100 text-xs font-bold flex items-center gap-2 animate-in fade-in shadow-md">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{message}</span>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="relative z-10 mb-4 p-2.5 rounded-2xl bg-rose-500/25 backdrop-blur-md border border-rose-400/50 text-rose-100 text-xs font-medium flex items-center gap-2 animate-in fade-in shadow-md">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-300" />
                  <span className="leading-snug">{errorMessage}</span>
                </div>
              )}

              {/* Verification Code Form (if Clerk email verification required) */}
              {pendingVerification ? (
                <form onSubmit={handleVerifyCode} className="relative z-10 space-y-3">
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-white/70 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="6-digit verification code"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/25 hover:bg-black/35 focus:bg-black/45 backdrop-blur-md text-xs font-semibold text-white placeholder:text-white/55 border border-white/20 focus:border-white/55 outline-none shadow-inner transition-all tracking-widest text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl hover:bg-white active:scale-[0.99] disabled:opacity-75"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 8px 24px -3px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 1)',
                    }}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Verify & Complete</span>
                        <Sparkles className="w-3.5 h-3.5 fill-slate-900" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPendingVerification(false);
                      setErrorMessage(null);
                      setMessage(null);
                    }}
                    className="w-full py-1 text-[11px] font-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    Back to sign up
                  </button>
                </form>
              ) : (
                /* Standard Sign In / Sign Up Form */
                <form onSubmit={handleEmailSubmit} className="relative z-10 space-y-3">
                  {mode === 'signup' && (
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 text-white/70 pointer-events-none">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/25 hover:bg-black/35 focus:bg-black/45 backdrop-blur-md text-xs font-semibold text-white placeholder:text-white/55 border border-white/20 focus:border-white/55 outline-none shadow-inner transition-all"
                      />
                    </div>
                  )}

                  {/* Email Field */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-white/70 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-black/25 hover:bg-black/35 focus:bg-black/45 backdrop-blur-md text-xs font-semibold text-white placeholder:text-white/55 border border-white/20 focus:border-white/55 outline-none shadow-inner transition-all"
                    />
                  </div>

                  {/* Password Field */}
                  <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-white/70 pointer-events-none">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl bg-black/25 hover:bg-black/35 focus:bg-black/45 backdrop-blur-md text-xs font-semibold text-white placeholder:text-white/55 border border-white/20 focus:border-white/55 outline-none shadow-inner transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-white/70 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm font-bold text-slate-950 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl hover:bg-white active:scale-[0.99] disabled:opacity-75"
                    style={{
                      background: 'linear-gradient(180deg, #ffffff 0%, #edf2f7 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.9)',
                      boxShadow: '0 8px 24px -3px rgba(0, 0, 0, 0.5), inset 0 1px 1px 0 rgba(255, 255, 255, 1)',
                    }}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>{mode === 'signin' ? 'Sign in' : 'Get started'}</span>
                        <Sparkles className="w-3.5 h-3.5 fill-slate-900" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Dotted Divider: · · · · Or sign in with · · · · */}
              <div className="relative z-10 flex items-center justify-center my-5">
                <div className="w-full border-t border-dotted border-white/25" />
                <span className="absolute px-3 text-[11px] font-semibold text-white/80 bg-black/35 rounded-full backdrop-blur-md border border-white/20 shadow-2xs">
                  Or sign in with
                </span>
              </div>

              {/* Real Clerk Social Authentication 2-Grid: Exactly [ Google ] and [ Apple ] */}
              <div className="relative z-10 grid grid-cols-2 gap-3">
                {/* Google Button */}
                <button
                  type="button"
                  disabled={isSocialLoading !== null}
                  onClick={() => handleSocialAuth('Google')}
                  className="py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Sign in with Google via Clerk"
                >
                  {isSocialLoading === 'Google' ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#EA4335"
                        d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.4 1.9 7.8l3.7-2.9z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                      />
                    </svg>
                  )}
                </button>

                {/* Apple Button - Visual placeholder only */}
                <button
                  type="button"
                  disabled={isSocialLoading !== null}
                  onClick={() => handleSocialAuth('Apple')}
                  className="py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/25 shadow-md hover:shadow-lg transition-all flex items-center justify-center cursor-pointer hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  title="Sign in with Apple (Placeholder)"
                >
                  <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.75 1.04-1.8 1.01-2.87-.96.04-2.13.65-2.79 1.43-.59.68-1.11 1.77-1.01 2.82 1.08.08 2.18-.63 2.79-1.38z" />
                  </svg>
                </button>
              </div>

              {/* Toggle between Sign in & Join Account */}
              <div className="relative z-10 mt-6 text-center text-xs text-white/80 font-semibold drop-shadow-xs">
                {mode === 'signin' ? (
                  <span>
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setPendingVerification(false);
                        setErrorMessage(null);
                        setMessage(null);
                      }}
                      className="font-bold text-white underline underline-offset-2 hover:text-white/80 cursor-pointer ml-1"
                    >
                      Join now
                    </button>
                  </span>
                ) : (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setPendingVerification(false);
                        setErrorMessage(null);
                        setMessage(null);
                      }}
                      className="font-bold text-white underline underline-offset-2 hover:text-white/80 cursor-pointer ml-1"
                    >
                      Sign in
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
