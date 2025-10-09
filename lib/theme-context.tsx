import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Preferred = 'system' | 'light' | 'dark';

type Ctx = {
  preferred: Preferred;
  scheme: 'light' | 'dark';
  setPreferred: (p: Preferred) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const sys = useRNColorScheme() ?? 'light';
  const [preferred, setPreferred] = useState<Preferred>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme.preferred').then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setPreferred(v);
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, []);

  const setPreferredPersist = (p: Preferred) => {
    setPreferred(p);
    AsyncStorage.setItem('theme.preferred', p).catch(() => {});
  };

  const scheme = preferred === 'system' ? (sys as 'light' | 'dark') : preferred;
  const value = useMemo(() => ({ preferred, scheme, setPreferred: setPreferredPersist }), [preferred, scheme]);

  if (!loaded) return null;
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('ThemeProvider missing');
  return ctx;
}

