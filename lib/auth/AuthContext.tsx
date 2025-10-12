import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, adminAuth, adminDb } from '../../config/firebase.config';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { FirestoreService, UserProfile, UserRole } from '../firestore';

type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  signingOut: boolean;
  loading: boolean;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  adminCreateUser: (email: string, password: string, displayName: string, role?: UserRole) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await FirestoreService.getUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setUser(user);
      if (user) {
        await loadUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInHandler = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signOutHandler = async () => {
    try {
      setSigningOut(true);
      await signOut(auth);
    } catch (error) {
      throw error;
    } finally {
      setSigningOut(false);
    }
  };

  const signUpHandler = async (email: string, password: string, displayName: string, role: UserRole = 'staff') => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName });

      // Create user profile in Firestore
      await FirestoreService.createUserProfile(
        userCredential.user.uid,
        email,
        displayName,
        role
      );
    } catch (error) {
      throw error;
    }
  };

  // Admin-only: create a user without switching the current session
  const adminCreateUser = async (email: string, password: string, displayName: string, role: UserRole = 'staff') => {
    try {
      // Create using secondary auth instance
      const cred = await createUserWithEmailAndPassword(adminAuth, email, password);
      await updateProfile(cred.user, { displayName });

      // Write profile using adminDb (bound to adminAuth session) so rules allow create by the new user
      const now = Date.now();
      const profile: UserProfile = {
        id: cred.user.uid,
        email,
        displayName,
        role,
        created_at: now,
        updated_at: now,
        isActive: true,
      };
      await setDoc(doc(adminDb, 'users', cred.user.uid), profile);

      // Important: sign out the secondary auth to avoid it persisting
      try { await signOut(adminAuth); } catch (_) {}
    } catch (error) {
      // Best-effort cleanup
      try { await signOut(adminAuth); } catch (_) {}
      throw error;
    }
  };

  const refreshUserProfile = async () => {
    if (user) {
      await loadUserProfile(user.uid);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    return userProfile?.role === role;
  };

  const isAdmin = (): boolean => {
    return userProfile?.role === 'admin';
  };

  const isStaff = (): boolean => {
    return userProfile?.role === 'staff';
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      signingOut,
      loading,
      initializing: loading,
      signIn: signInHandler,
      signOut: signOutHandler,
      signUp: signUpHandler,
      adminCreateUser,
      refreshUserProfile,
      hasRole,
      isAdmin,
      isStaff,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};