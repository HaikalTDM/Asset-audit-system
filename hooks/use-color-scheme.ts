import { useThemePreference } from '@/lib/theme-context';

// Return the effective scheme (light/dark) based on app preference.
export function useColorScheme() {
  const { scheme } = useThemePreference();
  return scheme;
}
