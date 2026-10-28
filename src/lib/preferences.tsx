import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Two independent global preferences, persisted in localStorage:
 * - Anime language (EN = prefer English dub, JP = prefer Japanese original audio).
 *   This never translates the site UI or titles.
 * - Site style (manga / glass / Netflix) — visual appearance only.
 */
export type AnimeLanguage = "en" | "jp";
export type ThemePref = "manga" | "glass" | "netflix";

export const LANG_KEY = "animehub:anime-language";
export const THEME_KEY = "animehub:theme";

/** Runs before hydration (inlined in <head>) so the right theme paints first. */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}")||"manga";if(t!=="manga"&&t!=="glass"&&t!=="netflix")t="manga";var r=document.documentElement;r.classList.add("dark");r.classList.remove("theme-manga","theme-glass","theme-netflix");r.classList.add("theme-"+t);r.style.colorScheme="dark";}catch(e){}})();`;if(t!=="manga"&&t!=="glass"&&t!=="netflix")t="manga";var r=document.documentElement;r.classList.add("dark");r.classList.remove("theme-manga","theme-glass","theme-netflix");r.classList.add("theme-"+t);r.style.colorScheme="dark";}catch(e){}})();`;

type Ctx = {
  language: AnimeLanguage;
  setLanguage: (l: AnimeLanguage) => void;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
  showHomeHistory: boolean;
  setShowHomeHistory: (show: boolean) => void;
  showHomeWatchlist: boolean;
  setShowHomeWatchlist: (show: boolean) => void;
};

const PreferencesContext = createContext<Ctx | null>(null);

function applyTheme(theme: ThemePref) {
  const root = document.documentElement;
  root.classList.add("dark");
  root.classList.remove("theme-manga", "theme-glass", "theme-netflix");
  root.classList.add(`theme-${theme}`);
  root.style.colorScheme = "dark";
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AnimeLanguage>("en");
  const [theme, setThemeState] = useState<ThemePref>("manga");
  const [showHomeHistory, setShowHomeHistoryState] = useState(true);
  const [showHomeWatchlist, setShowHomeWatchlistState] = useState(true);

  // Read stored values after hydration to avoid SSR mismatches.
  useEffect(() => {
    try {
      const l = localStorage.getItem(LANG_KEY);
      if (l === "en" || l === "jp") setLanguageState(l);
      const t = localStorage.getItem(THEME_KEY);
      if (t === "manga" || t === "glass" || t === "netflix") {
        setThemeState(t);
      } else {
        // Migrate the old light/dark/system setting to the manga default.
        localStorage.setItem(THEME_KEY, "manga");
      }
      setShowHomeHistoryState(localStorage.getItem("animehub:home-history") !== "hidden");
      setShowHomeWatchlistState(localStorage.getItem("animehub:home-watchlist") !== "hidden");
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setLanguage = useCallback((l: AnimeLanguage) => {
    setLanguageState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const setTheme = useCallback((t: ThemePref) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* ignore */
    }
  }, []);

  const setShowHomeHistory = useCallback((show: boolean) => {
    setShowHomeHistoryState(show);
    try {
      localStorage.setItem("animehub:home-history", show ? "visible" : "hidden");
    } catch {
      /* ignore */
    }
  }, []);

  const setShowHomeWatchlist = useCallback((show: boolean) => {
    setShowHomeWatchlistState(show);
    try {
      localStorage.setItem("animehub:home-watchlist", show ? "visible" : "hidden");
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <PreferencesContext.Provider value={{ language, setLanguage, theme, setTheme, showHomeHistory, setShowHomeHistory, showHomeWatchlist, setShowHomeWatchlist }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}

/** Maps the anime-language preference onto AniEmbed's documented `lang` parameter. */
export function providerLang(language: AnimeLanguage): "dub" | "sub" {
  return language === "en" ? "dub" : "sub";
}
