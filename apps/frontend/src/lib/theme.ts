export type ThemeOption = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dcash:theme';
const CHANGE_EVENT = 'dcash:theme-change';

export function getStoredTheme(): ThemeOption {
  if (typeof window === 'undefined') return 'system';
  try {
    return (localStorage.getItem(STORAGE_KEY) as ThemeOption) || 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(theme: ThemeOption): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Single source of truth for the `data-theme` attribute on <html>. */
export function applyTheme(theme: ThemeOption) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: theme }));
}

export function onThemeChange(cb: (theme: ThemeOption) => void) {
  const handler = (e: Event) => cb((e as CustomEvent<ThemeOption>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
