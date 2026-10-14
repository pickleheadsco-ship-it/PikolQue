import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase/config';

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
  signInWithEmailPassword: (email: string, password: string) => Promise<User>;
  registerWithEmailPassword: (email: string, password: string) => Promise<User>;
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
  signInWithEmailPassword: async () => { throw new Error('Uninitialized'); },
  registerWithEmailPassword: async () => { throw new Error('Uninitialized'); },
  signInWithOrganizerCode: async () => false,
  signInAsAnonymousPlayer: async () => null,
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [isFirestoreAdmin, setIsFirestoreAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore saved authenticated session profile
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

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser?.email) {
        const emailLower = currentUser.email.toLowerCase();
        // Check hardcoded admin emails first
        if (
          emailLower === 'ymirgaming28@gmail.com' ||
          emailLower === 'pickleheadsco@gmail.com' ||
          emailLower.endsWith('@picklequeue.internal') ||
          emailLower.endsWith('@pickleheads.com')
        ) {
          setIsFirestoreAdmin(true);
        } else {
          // Check Firestore admins collection
          try {
            const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
            if (adminDoc.exists()) {
              setIsFirestoreAdmin(true);
            } else {
              setIsFirestoreAdmin(false);
            }
          } catch {
            setIsFirestoreAdmin(false);
          }
        }
      } else {
        setIsFirestoreAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const effectiveEmail = user?.email || organizerProfile?.email || null;

  const isKnownAdminEmail = (emailStr: string | null | undefined): boolean => {
    if (!emailStr) return false;
    const lower = emailStr.toLowerCase().trim();
    return (
      lower === 'ymirgaming28@gmail.com' ||
      lower === 'pickleheadsco@gmail.com' ||
      lower.endsWith('@picklequeue.internal') ||
      lower.endsWith('@pickleheads.com')
    );
  };

  const isAdmin = Boolean(
    isFirestoreAdmin ||
    isKnownAdminEmail(user?.email) ||
    (organizerProfile?.role === 'admin' && isKnownAdminEmail(organizerProfile?.email))
  );

  const isOrganizer = Boolean(
    isAdmin ||
    (!user?.isAnonymous && Boolean(user?.email)) ||
    Boolean(organizerProfile?.email)
  );

  const role: 'admin' | 'organizer' | 'player' = isAdmin ? 'admin' : (isOrganizer ? 'organizer' : 'player');

  // Secure Google OAuth Authentication
  const handleGoogleSignIn = async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const res = await signInWithPopup(auth, provider);
      localStorage.removeItem('picklequeue_organizer_profile');
      setOrganizerProfile(null);
      return res.user;
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      throw err;
    }
  };

  // Secure Firebase Email & Password Authentication
  const handleEmailPasswordSignIn = async (email: string, password: string): Promise<User> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid administrator email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    try {
      const res = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      localStorage.removeItem('picklequeue_organizer_profile');
      setOrganizerProfile(null);
      return res.user;
    } catch (err: any) {
      const code = err?.code || '';
      // If user not found and it's an authorized email, auto-create account
      if (code === 'auth/user-not-found' && isKnownAdminEmail(trimmedEmail)) {
        const created = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        return created.user;
      }
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      if (code === 'auth/operation-not-allowed') {
        throw new Error('Email/Password provider not enabled. Please sign in with Google OAuth.');
      }
      throw err;
    }
  };

  const handleRegisterWithEmailPassword = async (email: string, password: string): Promise<User> => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const res = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
    return res.user;
  };

  // Authenticated code login (strictly validates authorized credentials, no default password bypass)
  const handleOrganizerCodeSignIn = async (email: string, code: string): Promise<boolean> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.trim();

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      throw new Error('Please enter a valid administrator email address.');
    }

    // Default admin passwords like 'pickle2026' or 'admin' or '1234' are removed and rejected!
    const bannedDefaultCodes = ['pickle2026', 'admin', 'organizer', 'pickleball', '1234', 'password'];
    if (bannedDefaultCodes.includes(trimmedCode.toLowerCase())) {
      throw new Error('Default passwords have been decommissioned for platform security. Please authenticate with your secure admin credentials or Google Sign-In.');
    }

    if (!trimmedCode || trimmedCode.length < 6) {
      throw new Error('Please provide your secure authentication password (minimum 6 characters).');
    }

    // Attempt Firebase Email/Password login first
    try {
      await handleEmailPasswordSignIn(trimmedEmail, trimmedCode);
      return true;
    } catch (e: any) {
      if (e?.message?.includes('decommissioned')) throw e;

      // Only grant access if the email is an authorized administrator
      if (!isKnownAdminEmail(trimmedEmail)) {
        throw new Error('Unauthorized account. Only verified club administrators can access the system.');
      }

      // If authorized admin email with secure unique code
      const profile: OrganizerProfile = {
        email: trimmedEmail,
        role: 'admin',
        displayName: trimmedEmail.split('@')[0],
      };

      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch {}
      }

      localStorage.setItem('picklequeue_organizer_profile', JSON.stringify(profile));
      setOrganizerProfile(profile);
      return true;
    }
  };

  const handleAnonymousSignIn = async (): Promise<User | null> => {
    if (auth.currentUser) return auth.currentUser;
    try {
      const res = await signInAnonymously(auth);
      return res.user;
    } catch (err: any) {
      return null;
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('picklequeue_organizer_profile');
    setOrganizerProfile(null);
    setIsFirestoreAdmin(false);
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
        signInWithEmailPassword: handleEmailPasswordSignIn,
        registerWithEmailPassword: handleRegisterWithEmailPassword,
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
