import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { tokens } from "../theme/tokens";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
};

export function Button(props: ButtonProps) {
  const { label, onPress, variant = "primary", loading, disabled } = props;
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
        <ActivityIndicator color={variant === "primary" ? tokens.background : tokens.text} />
      ) : (
        <Text style={[styles.label, variant === "primary" && styles.primaryLabel]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: tokens.radius,
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
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: tokens.text,
    fontSize: tokens.type.body,
    fontWeight: "600",
  },
  primaryLabel: {
    color: tokens.background,
  },
});
