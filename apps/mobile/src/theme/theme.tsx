import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SplashScreen from "expo-splash-screen";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isThemeId, themeById, type ThemeColors, type ThemeId } from "./themes";

export type { ThemeColors, ThemeId } from "./themes";

const THEME_STORAGE_KEY = "savorly.theme";

type ThemeContextValue = {
  id: ThemeId;
  colors: ThemeColors;
  setThemeId: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider(props: ThemeProviderProps) {
  const { children } = props;
  const [themeId, setThemeIdState] = useState<ThemeId | null>(null);

  useEffect(() => {
    let cancelled = false;
    void AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        setThemeIdState(isThemeId(stored) ? stored : "lively");
      })
      .catch(() => {
        if (!cancelled) setThemeIdState("lively");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!themeId) return;
    void SplashScreen.hideAsync();
  }, [themeId]);

  const setThemeId = useCallback((id: ThemeId) => {
    setThemeIdState(id);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const value = useMemo<ThemeContextValue | null>(() => {
    if (!themeId) return null;
    return { id: themeId, colors: themeById(themeId).colors, setThemeId };
  }, [setThemeId, themeId]);

  if (!value) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeContext(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("ThemeProvider is missing.");
  }
  return value;
}

export function useTheme(): ThemeColors {
  return useThemeContext().colors;
}

export function useThemeId(): ThemeId {
  return useThemeContext().id;
}

export function useSetTheme(): (id: ThemeId) => void {
  return useThemeContext().setThemeId;
}

export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  const colors = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
