import { useState, useEffect, useCallback } from "react";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "khoji_theme_preference";

/**
 * Custom React hook for complete Light/Dark theme management.
 * - Persists user preference in localStorage.
 * - Respects system OS setting (prefers-color-scheme: dark).
 * - Applies/removes 'dark' class on <html> document element.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Apply theme class to <html> and update resolvedTheme
  const applyTheme = useCallback((targetTheme: ThemeMode) => {
    const isDark =
      targetTheme === "dark" ||
      (targetTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
      setResolvedTheme("dark");
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
      setResolvedTheme("light");
    }
  }, []);

  // Update theme setting
  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  };

  // Toggle between light and dark directly
  const toggleTheme = () => {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  // Listen to OS prefers-color-scheme changes when in "system" mode
  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, applyTheme]);

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    setTheme,
    toggleTheme,
  };
}

export default useTheme;
