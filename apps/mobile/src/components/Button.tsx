import { useTheme, useThemedStyles, type ThemeColors } from "../theme/theme";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View, StyleSheet } from "react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  size?: "default" | "compact";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button(props: ButtonProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  const { label, onPress, variant = "primary", size = "default", loading, disabled, icon } = props;
  const compact = size === "compact";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? colors.onAccent : colors.text} size={compact ? "small" : "large"} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText
            variant={compact ? "caption" : "body"}
            style={[styles.label, variant === "primary" && styles.primaryLabel]}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },
  compact: {
    minHeight: 32,
    alignSelf: "flex-start",
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  label: {
    fontFamily: tokens.font.bodyBold,
    color: colors.text,
  },
  primaryLabel: {
    color: colors.onAccent,
    fontFamily: tokens.font.bodyBold,
  },
});
}

