import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark" | "amoled";
const KEY = "flow.theme";

type Ctx = { theme: Theme; setTheme: (t: Theme) => void };
const ThemeCtx = createContext<Ctx>({ theme: "dark", setTheme: () => {} });

function apply(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("dark", "amoled");
  if (theme === "dark") root.classList.add("dark");
  if (theme === "amoled") root.classList.add("dark", "amoled");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && window.localStorage.getItem(KEY)) as Theme | null;
    const initial: Theme = stored ?? "dark";
    setThemeState(initial);
    apply(initial);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    apply(t);
    try { window.localStorage.setItem(KEY, t); } catch {}
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
