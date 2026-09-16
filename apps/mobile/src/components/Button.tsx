import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export function Button(props: ButtonProps) {
  const { label, onPress, variant = "primary", loading, disabled, icon } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? tokens.bg : tokens.text} />
      ) : (
        <View style={styles.row}>
          {icon}
          <AppText variant="body" style={[styles.label, variant === "primary" && styles.primaryLabel]}>
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: tokens.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.lg,
  },
  primary: {
    backgroundColor: tokens.accent,
  },
  secondary: {
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
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
    color: tokens.text,
  },
  primaryLabel: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
  },
});
