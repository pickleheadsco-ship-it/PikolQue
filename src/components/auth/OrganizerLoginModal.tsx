import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LogIn,
  X,
  Shield,
  Key,
  AlertCircle,
  CheckCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface OrganizerLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (action?: 'open_active' | 'create_session' | 'admin') => void;
}

export const OrganizerLoginModal: React.FC<OrganizerLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { signInWithGoogle, signInWithOrganizerCode } = useAuth();

  const [activeTab, setActiveTab] = useState<'passcode' | 'google'>('passcode');
  const [emailInput, setEmailInput] = useState('pickleheadsco@gmail.com');
  const [passcodeInput, setPasscodeInput] = useState('pickle2026');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDomainUnauthorized, setIsDomainUnauthorized] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setIsDomainUnauthorized(false);

    try {
      await signInWithGoogle();
      if (onSuccess) onSuccess('open_active');
      onClose();
    } catch (err: any) {
      console.error('Google login error in modal:', err);
      const code = err?.code || '';
      const message = err?.message || '';

      if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
        setIsDomainUnauthorized(true);
        setErrorMsg('Domain not yet authorized in Firebase for Google OAuth. Use 1-Click Instant Login below.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Browser blocked Google popup. Use 1-Click Instant Login below.');
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in popup closed. Use 1-Click Instant Login below.');
      } else {
        setErrorMsg(message || 'Failed to authenticate with Google. Use 1-Click Instant Login below.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasscodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg('Please enter an organizer or admin email.');
      return;
    }
    const codeToUse = passcodeInput.trim() || 'pickle2026';

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithOrganizerCode(emailInput, codeToUse);
      if (onSuccess) onSuccess('open_active');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Login failed. Please verify your passcode.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStaffLogin = async (presetEmail: string, actionTarget: 'open_active' | 'create_session' | 'admin' = 'open_active') => {
    setEmailInput(presetEmail);
    setPasscodeInput('pickle2026');
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await signInWithOrganizerCode(presetEmail, 'pickle2026');
      if (onSuccess) onSuccess(actionTarget);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="clay-card rounded-3xl max-w-lg w-full max-h-[92dvh] overflow-y-auto p-5 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center clay-subcard">
              <Shield className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-900 text-lg tracking-tight">Organizer & Staff Login</h2>
              <p className="text-xs text-slate-500 font-medium">Access Court Management, Live Queues & Admin Tools</p>
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
              setActiveTab('passcode');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              activeTab === 'passcode'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-600" />
            <span>Organizer Passcode</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-700 font-black">
              Instant
            </span>
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
            <span>Google Account</span>
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

        {/* Firebase Domain Authorization Guidance Callout */}
        {isDomainUnauthorized && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-2 font-black text-amber-950">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Firebase Live Domain Setup Required</span>
            </div>
            <p className="leading-relaxed text-amber-800 font-medium">
              Because this app is running on a live Cloudflare/custom domain, Firebase requires this domain to be added to your Authorized Domains list in the Firebase Console:
            </p>
            <div className="flex items-center justify-between gap-2 bg-amber-100/80 px-3 py-2 rounded-xl font-mono text-[11px] font-bold text-amber-950">
              <span className="truncate">{currentHostname}</span>
              <button
                type="button"
                onClick={handleCopyHostname}
                className="px-2 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 flex items-center gap-1 font-sans text-xs transition-colors shrink-0"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px]">
              <a
                href="https://console.firebase.google.com/project/gen-lang-client-0245174108/authentication/settings"
                target="_blank"
                rel="noreferrer"
                className="text-amber-900 font-bold underline inline-flex items-center gap-1 hover:text-amber-950"
              >
                <span>Open Firebase Authorized Domains</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-emerald-800 font-extrabold">
                💡 Or log in instantly below without domain setup:
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleQuickStaffLogin('pickleheadsco@gmail.com')}
              disabled={isLoading}
              className="mt-2 w-full py-2.5 px-3 rounded-xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center justify-center gap-2 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Log In as pickleheadsco@gmail.com Instantly</span>
            </button>
          </div>
        )}

        {/* TAB 1: Passcode / Direct Organizer Access */}
        {activeTab === 'passcode' && (
          <form onSubmit={handlePasscodeLogin} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                Organizer / Admin Email
              </label>
              <div className="clay-inset rounded-2xl px-3.5 py-2.5">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="e.g. pickleheadsco@gmail.com"
                  className="w-full bg-transparent font-medium text-slate-900 text-xs sm:text-sm focus:outline-hidden"
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setEmailInput('pickleheadsco@gmail.com')}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all ${
                    emailInput === 'pickleheadsco@gmail.com'
                      ? 'bg-purple-100 text-purple-800 font-black ring-1 ring-purple-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  👑 Owner: pickleheadsco@gmail.com
                </button>
                <button
                  type="button"
                  onClick={() => setEmailInput('organizer@picklequeue.internal')}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition-all ${
                    emailInput === 'organizer@picklequeue.internal'
                      ? 'bg-emerald-100 text-emerald-800 font-black ring-1 ring-emerald-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  🎾 Court Organizer
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-black text-slate-700">Organizer Passcode</label>
                <span className="text-[11px] text-slate-400 font-bold">Default: pickle2026</span>
              </div>
              <div className="clay-inset rounded-2xl px-3.5 py-2.5">
                <input
                  type="password"
                  required
                  value={passcodeInput}
                  onChange={(e) => setPasscodeInput(e.target.value)}
                  placeholder="Enter passcode (e.g. pickle2026)"
                  className="w-full bg-transparent font-mono font-bold text-slate-900 text-xs sm:text-sm focus:outline-hidden"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl clay-btn clay-btn-primary text-white text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Log In as Organizer / Admin</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>

            {/* Instant 1-Click Buttons */}
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-400 font-bold mb-2">1-Click Fast Access:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickStaffLogin('pickleheadsco@gmail.com')}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-xl clay-btn clay-btn-secondary text-[11px] font-black text-purple-700 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Admin Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickStaffLogin('organizer@picklequeue.internal')}
                  disabled={isLoading}
                  className="py-2.5 px-3 rounded-xl clay-btn clay-btn-secondary text-[11px] font-black text-emerald-700 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Club Organizer</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: Google Sign-In */}
        {activeTab === 'google' && (
          <div className="mt-5 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Sign in with your Google Account. Organizers with authorized emails (e.g. <strong className="text-slate-900 font-bold">pickleheadsco@gmail.com</strong>) will be granted administrative and queue management permissions.
            </p>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl clay-btn clay-btn-secondary text-slate-800 text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 shadow-xs disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Connecting to Google...</span>
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
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="p-3.5 rounded-2xl clay-subcard text-[11px] text-slate-500 font-medium space-y-2">
              <p className="font-bold text-slate-700">Note for Live Deployments:</p>
              <p>
                If your live domain is not yet listed under Firebase Console Authorized Domains, click below for instant access without any domain restrictions:
              </p>
              <button
                type="button"
                onClick={() => handleQuickStaffLogin('pickleheadsco@gmail.com')}
                disabled={isLoading}
                className="w-full py-2.5 px-3 rounded-xl clay-btn clay-btn-primary text-white text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Instant Login as Organizer (Bypass Google domain)</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
