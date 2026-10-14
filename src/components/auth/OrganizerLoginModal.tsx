import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogIn,
  X,
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Loader2,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react';

interface OrganizerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (action?: 'open_active' | 'create_session' | 'admin') => void;
  onOpenBookDemo?: () => void;
}

export const OrganizerLoginModal: React.FC<OrganizerLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenBookDemo,
}) => {
  const { signInWithGoogle, signInWithOrganizerCode, signInWithEmailPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'password' | 'google'>('password');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess('open_active');
      onClose();
    } catch (err: any) {
      console.error('Google login error:', err);
      const message = err?.message || '';
      if (err?.code === 'auth/popup-blocked') {
        setErrorMsg('Browser popup was blocked. Please enable popups or sign in with your email credentials.');
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled. Please try again or use email login.');
      } else if (err?.code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
        setErrorMsg('Domain pending Firebase authorization. Please sign in with your email and password below.');
      } else {
        setErrorMsg(message || 'Failed to authenticate with Google. Please try email login.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = emailInput.trim().toLowerCase();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedEmail) {
      setErrorMsg('Please enter your authorized administrator email address.');
      return;
    }

    if (!trimmedPassword) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    if (trimmedPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    // Explicit rejection of decommissioned default passwords
    const bannedCodes = ['pickle2026', 'admin', 'password', '1234', '123456', 'pickleball'];
    if (bannedCodes.includes(trimmedPassword.toLowerCase())) {
      setErrorMsg('Default passwords have been decommissioned for platform security. Please enter your secure admin password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithOrganizerCode(trimmedEmail, trimmedPassword);
      if (onSuccess) onSuccess('open_active');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-md w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-7 shadow-2xl border-2 border-emerald-400">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg tracking-tight">Admin Authentication</h2>
              <p className="text-xs text-slate-500 font-medium">Restricted access for verified club administrators</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl clay-btn clay-btn-secondary flex items-center justify-center text-slate-500 hover:text-slate-800"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex clay-inset rounded-2xl p-1 gap-1 text-xs font-black mt-5">
          <button
            type="button"
            onClick={() => {
              setActiveTab('password');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'password'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure Password</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('google');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'google'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-3.5 h-3.5 text-sky-600" />
            <span>Google OAuth</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* TAB 1: Secure Email & Password Login */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>Administrator Email Address</span>
              </label>
              <div className="clay-inset rounded-2xl px-3.5 py-2.5">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@yourclub.com or pickleheadsco@gmail.com"
                  className="w-full bg-transparent font-medium text-slate-900 text-xs sm:text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Admin Password</span>
              </label>
              <div className="clay-inset rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter your secure password"
                  className="w-full bg-transparent font-bold text-slate-900 text-xs sm:text-sm focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 ml-2 focus:outline-hidden"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailInput.trim() || !passwordInput.trim()}
              className="w-full py-3.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Sign In as Authenticated Admin</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: Google Sign-In */}
        {activeTab === 'google' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Sign in securely using Google OAuth. Access is granted to verified administrators associated with this facility.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl clay-btn clay-btn-secondary text-slate-800 text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Authenticating with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google Account</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Unauthenticated Facility Notice & Book a Demo CTA */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 font-medium mb-3">
            Not an authorized club admin yet?
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenBookDemo) onOpenBookDemo();
            }}
            className="w-full py-2.5 rounded-2xl clay-btn clay-btn-secondary text-emerald-800 text-xs font-black flex items-center justify-center gap-2 hover:border-emerald-300 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Book a Demo for Your Club</span>
          </button>
        </div>
      </div>
    </div>
  );
};
