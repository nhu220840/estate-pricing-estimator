export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "tinix-theme-pref";

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "dark";
  const raw = localStorage.getItem(THEME_STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "dark";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function effectiveDarkMode(
  pref: ThemePreference,
  systemDark: boolean
): boolean {
  if (pref === "system") return systemDark;
  return pref === "dark";
}
