import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextType = {
  preference: ThemePreference;
  scheme: 'light' | 'dark';
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const STORAGE_KEY = 'asset_audit_theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [scheme, setScheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setPreference(saved);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const updateScheme = () => {
      if (preference === 'system') {
        setScheme(media.matches ? 'dark' : 'light');
      } else {
        setScheme(preference);
      }
    };

    updateScheme();
    media.addEventListener('change', updateScheme);
    return () => media.removeEventListener('change', updateScheme);
  }, [preference]);

  useEffect(() => {
    document.body.dataset.theme = scheme;
  }, [scheme]);

  const setPreferencePersist = (pref: ThemePreference) => {
    setPreference(pref);
    localStorage.setItem(STORAGE_KEY, pref);
  };

  const value = useMemo(() => ({ preference, scheme, setPreference: setPreferencePersist }), [preference, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
