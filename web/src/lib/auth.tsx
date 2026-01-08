import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, type ApiUser } from './api';

type AuthContextType = {
  user: ApiUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    const data = await api.me();
    setUser(data.user);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadProfile();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await api.login(email, password);
    setToken(data.token);
    setUser(data.user);
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, signIn, signOut, refresh: loadProfile }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export type { ApiUser };
