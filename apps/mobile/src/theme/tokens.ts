export const tokens = {
  bg: "#0E1116",
  bgElevated: "#141A22",
  surface: "#1C232E",
  border: "#2C3440",
  text: "#F4F1EA",
  textMuted: "#A8A093",
  accent: "#E8A87C",
  accentMuted: "rgba(232, 168, 124, 0.16)",
  scrim: "rgba(14, 17, 22, 0.78)",
  danger: "#E26D5A",
  success: "#8FBF9F",
  space: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 24,
    6: 32,
    7: 48,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 8,
    md: 14,
    lg: 22,
    full: 999,
  },
  type: {
    display: { fontSize: 34, lineHeight: 40, fontFamily: "Fraunces_600SemiBold" },
    title: { fontSize: 22, lineHeight: 28, fontFamily: "Fraunces_600SemiBold" },
    body: { fontSize: 16, lineHeight: 24, fontFamily: "DMSans_400Regular" },
    label: { fontSize: 13, lineHeight: 18, fontFamily: "DMSans_700Bold" },
    caption: { fontSize: 13, lineHeight: 18, fontFamily: "DMSans_400Regular" },
  },
  font: {
    display: "Fraunces_600SemiBold",
    body: "DMSans_400Regular",
    bodyMedium: "DMSans_500Medium",
    bodyBold: "DMSans_700Bold",
  },
  shadow: {
    card: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  tabBarHeight: 64,
} as const;

export const background = tokens.bg;
export const muted = tokens.textMuted;
