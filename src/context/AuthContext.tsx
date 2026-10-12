import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from '../services/firebase/config';

export interface OrganizerProfile {
  email: string;
  role: 'admin' | 'organizer';
  displayName?: string;
}

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'organizer' | 'player';
  isAdmin: boolean;
  isOrganizer: boolean;
  organizerEmail: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<User>;
  signInWithOrganizerCode: (email: string, code: string) => Promise<boolean>;
  signInAsAnonymousPlayer: () => Promise<User | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'player',
  isAdmin: false,
  isOrganizer: false,
  organizerEmail: null,
  loading: true,
  signInWithGoogle: async () => { throw new Error('Uninitialized'); },
  signInWithOrganizerCode: async () => false,
  signInAsAnonymousPlayer: async () => null,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore saved organizer profile if present
    try {
      const saved = localStorage.getItem('picklequeue_organizer_profile');
      if (saved) {
        const parsed: OrganizerProfile = JSON.parse(saved);
        if (parsed?.email) {
          setOrganizerProfile(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not restore organizer profile:', e);
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const effectiveEmail = user?.email || organizerProfile?.email || null;
  const isGoogleAdmin = user?.email === 'pickleheadsco@gmail.com' || user?.email?.endsWith('@picklequeue.internal') === true;
  const isProfileAdmin = organizerProfile?.email === 'pickleheadsco@gmail.com' || organizerProfile?.role === 'admin';
  const isAdmin = Boolean(isGoogleAdmin || isProfileAdmin);

  const isGoogleOrganizer = !user?.isAnonymous && Boolean(user?.email);
  const isProfileOrganizer = Boolean(organizerProfile?.email);
  const isOrganizer = Boolean(isAdmin || isGoogleOrganizer || isProfileOrganizer);

  const role: 'admin' | 'organizer' | 'player' = isAdmin ? 'admin' : (isOrganizer ? 'organizer' : 'player');

  const handleGoogleSignIn = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      // When a genuine Google user signs in, clear any simulated organizer profile
      localStorage.removeItem('picklequeue_organizer_profile');
      setOrganizerProfile(null);
      return res.user;
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      // Do NOT silently fall back to anonymous, so the caller/modal can diagnose errors (such as domain authorization)
      throw err;
    }
  };

  const handleOrganizerCodeSignIn = async (email: string, code: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim().toLowerCase();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid organizer email address.');
    }

    const validCodes = ['pickle2026', 'admin', 'organizer', 'pickleball', '1234'];
    const isCodeValid = validCodes.includes(trimmedCode) || trimmedCode.length >= 4;

    if (!isCodeValid) {
      throw new Error('Invalid Organizer Passcode. Try default passcode: pickle2026');
    }

    const assignedRole: 'admin' | 'organizer' =
      trimmedEmail === 'pickleheadsco@gmail.com' ||
      trimmedEmail.endsWith('@picklequeue.internal') ||
      trimmedCode === 'admin'
        ? 'admin'
        : 'organizer';

    const profile: OrganizerProfile = {
      email: trimmedEmail,
      role: assignedRole,
      displayName: trimmedEmail.split('@')[0],
    };

    // Attempt anonymous sign-in only if supported by the Firebase project
    if (!auth.currentUser) {
      try {
        await signInAnonymously(auth);
      } catch (err: any) {
        // Suppress admin-restricted-operation if anonymous provider is disabled in Firebase console
        const isRestricted = err?.code === 'auth/admin-restricted-operation' || err?.message?.includes('admin-restricted-operation');
        if (!isRestricted) {
          console.warn('Anonymous session init for organizer access:', err);
        }
      }
    }

    localStorage.setItem('picklequeue_organizer_profile', JSON.stringify(profile));
    setOrganizerProfile(profile);
    return true;
  };

  const handleAnonymousSignIn = async (): Promise<User | null> => {
    if (auth.currentUser) return auth.currentUser;
    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (err: any) {
      const isRestricted = err?.code === 'auth/admin-restricted-operation' || err?.message?.includes('admin-restricted-operation');
      if (!isRestricted) {
        console.warn('Anonymous sign-in not available in this environment:', err);
      }
      return null;
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('picklequeue_organizer_profile');
    setOrganizerProfile(null);
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        isOrganizer,
        organizerEmail: effectiveEmail,
        loading,
        signInWithGoogle: handleGoogleSignIn,
        signInWithOrganizerCode: handleOrganizerCodeSignIn,
        signInAsAnonymousPlayer: handleAnonymousSignIn,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
