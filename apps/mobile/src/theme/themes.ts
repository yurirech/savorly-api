export const THEME_IDS = ["lively", "ember", "berry", "lagoon", "citrus"] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeColors = {
  bg: string;
  bgElevated: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  scrim: string;
  danger: string;
  success: string;
  yellow: string;
  orange: string;
  violet: string;
  mint: string;
};

export type Theme = {
  id: ThemeId;
  name: string;
  colors: ThemeColors;
};

function rgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function palette(colors: Omit<ThemeColors, "accentMuted" | "scrim">): ThemeColors {
  return {
    ...colors,
    accentMuted: rgba(colors.accent, 0.16),
    scrim: rgba(colors.bg, 0.78),
  };
}

export const THEMES: readonly Theme[] = [
  {
    id: "lively",
    name: "Lively",
    colors: palette({
      bg: "#12141C",
      bgElevated: "#1A1E2B",
      surface: "#242838",
      border: "#34384A",
      text: "#F6F4EF",
      textMuted: "#A7A9B8",
      accent: "#F3E56A",
      onAccent: "#12141C",
      danger: "#FF7A6E",
      success: "#7DFFC3",
      yellow: "#F3E56A",
      orange: "#FF9B4A",
      violet: "#C9A6FF",
      mint: "#7DFFC3",
    }),
  },
  {
    id: "ember",
    name: "Ember",
    colors: palette({
      bg: "#0E1116",
      bgElevated: "#141A22",
      surface: "#1C232E",
      border: "#2C3440",
      text: "#F4F1EA",
      textMuted: "#A8A093",
      accent: "#E8A87C",
      onAccent: "#0E1116",
      danger: "#E26D5A",
      success: "#8FBF9F",
      yellow: "#E8C07A",
      orange: "#E08A4F",
      violet: "#C7A4D6",
      mint: "#8FBF9F",
    }),
  },
  {
    id: "berry",
    name: "Berry",
    colors: palette({
      bg: "#1A1020",
      bgElevated: "#24162C",
      surface: "#321E3C",
      border: "#4A3058",
      text: "#F8F2FA",
      textMuted: "#B9A3C4",
      accent: "#FF7AD1",
      onAccent: "#1A1020",
      danger: "#FF6B6B",
      success: "#7DFFC3",
      yellow: "#F3E56A",
      orange: "#FF9B4A",
      violet: "#D4A0FF",
      mint: "#7DFFC3",
    }),
  },
  {
    id: "lagoon",
    name: "Lagoon",
    colors: palette({
      bg: "#071416",
      bgElevated: "#0E1E22",
      surface: "#153036",
      border: "#245058",
      text: "#F2F7F6",
      textMuted: "#9BB5B4",
      accent: "#3EE0D0",
      onAccent: "#071416",
      danger: "#FF7A6E",
      success: "#5DFFC8",
      yellow: "#E8F56A",
      orange: "#FFB15A",
      violet: "#A8C4FF",
      mint: "#5DFFC8",
    }),
  },
  {
    id: "citrus",
    name: "Citrus",
    colors: palette({
      bg: "#101208",
      bgElevated: "#171A0E",
      surface: "#222616",
      border: "#3A4024",
      text: "#F6F7EF",
      textMuted: "#B0B49A",
      accent: "#C6F54A",
      onAccent: "#101208",
      danger: "#FF7A6E",
      success: "#B6F07A",
      yellow: "#F3E56A",
      orange: "#FFB020",
      violet: "#D0C4FF",
      mint: "#B6F07A",
    }),
  },
];

const themeMap = new Map(THEMES.map((theme) => [theme.id, theme]));

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value != null && themeMap.has(value as ThemeId);
}

export function themeById(id: ThemeId): Theme {
  const theme = themeMap.get(id);
  if (!theme) {
    return THEMES[0];
  }
  return theme;
}
