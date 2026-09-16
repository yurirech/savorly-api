import { Text, type TextProps } from "react-native";
import { tokens } from "../theme/tokens";

type AppTextVariant = "display" | "title" | "body" | "label" | "caption";

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: "text" | "muted" | "accent" | "danger" | "success";
};

const colorMap = {
  text: tokens.text,
  muted: tokens.textMuted,
  accent: tokens.accent,
  danger: tokens.danger,
  success: tokens.success,
} as const;

export function AppText(props: AppTextProps) {
  const { variant = "body", color = "text", style, ...rest } = props;
  const type = tokens.type[variant];
  return (
    <Text
      {...rest}
      style={[
        {
          color: colorMap[color],
          fontSize: type.fontSize,
          lineHeight: type.lineHeight,
          fontFamily: type.fontFamily,
        },
        variant === "label" && { letterSpacing: 0.8, textTransform: "uppercase" },
        style,
      ]}
    />
  );
}
