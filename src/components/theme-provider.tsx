"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useServerInsertedHTML } from "next/navigation";

const STORAGE_KEY = "theme";
type Theme = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function themeScript(defaultTheme: Theme): string {
  return `(function(){try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||${JSON.stringify(defaultTheme)};var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var c=d?"dark":"light";var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=c;}catch(e){}})();`;
}

function applyToDom(theme: Theme) {
  const root = document.documentElement;
  const dark = resolve(theme) === "dark";
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function readStoredTheme(): Theme | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as Theme | null;
  } catch {
    return null;
  }
}

function subscribeToStorage(onChange: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

const ThemeContext = createContext<{
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}>({ theme: "system", resolvedTheme: "light", setTheme: () => {} });

// Reemplazo de next-themes (abandonado; React 19/Next 16 advierten por el
// <script> que inyectaba dentro de un Client Component). El script de tema se
// inyecta aquí vía useServerInsertedHTML, fuera del árbol React y sin warning,
// y el estado se expone con la misma API que useTheme de next-themes.
export function ThemeProvider({
  children,
  defaultTheme = "system",
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const clientSnapshot = useCallback((): Theme => readStoredTheme() ?? defaultTheme, [defaultTheme]);
  const theme = useSyncExternalStore(subscribeToStorage, clientSnapshot, () => defaultTheme);
  const resolvedTheme = useMemo(() => resolve(theme), [theme]);

  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: themeScript(defaultTheme) }} />
  ));

  useEffect(() => {
    applyToDom(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new Event("storage"));
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}