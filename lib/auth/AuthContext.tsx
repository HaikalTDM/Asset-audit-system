import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken, type ApiUser } from '@/lib/api';

type AuthContextType = {
  user: ApiUser | null;
  userProfile: ApiUser | null;
  signingOut: boolean;
  loading: boolean;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role?: 'admin' | 'staff') => Promise<void>;
  adminCreateUser: (email: string, password: string, displayName: string, role?: 'admin' | 'staff') => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  hasRole: (role: 'admin' | 'staff') => boolean;
  isAdmin: () => boolean;
  isStaff: () => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [userProfile, setUserProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const loadProfile = async () => {
    const data = await api.me();
    setUser(data.user);
    setUserProfile(data.user);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadProfile();
      } catch {
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInHandler = async (email: string, password: string) => {
    const data = await api.login(email, password);
    await setToken(data.token);
    setUser(data.user);
    setUserProfile(data.user);
  };

  const signOutHandler = async () => {
    try {
      setSigningOut(true);
      await setToken(null);
      setUser(null);
      setUserProfile(null);
    } finally {
      setSigningOut(false);
    }
  };

  const signUpHandler = async (email: string, password: string, displayName: string, role: 'admin' | 'staff' = 'staff') => {
    const data = await api.register(email, password, displayName, role);
    await setToken(data.token);
    setUser(data.user);
    setUserProfile(data.user);
  };

  const adminCreateUser = async (email: string, password: string, displayName: string, role: 'admin' | 'staff' = 'staff') => {
    await api.adminCreateUser(email, password, displayName, role);
  };

  const refreshUserProfile = async () => {
    await loadProfile();
  };

  const hasRole = (role: 'admin' | 'staff') => userProfile?.role === role;
  const isAdmin = () => userProfile?.role === 'admin';
  const isStaff = () => userProfile?.role === 'staff';

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
