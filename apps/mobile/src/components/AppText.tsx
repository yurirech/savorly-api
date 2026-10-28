import { Text, type TextProps } from "react-native";
import { tokens } from "../theme/tokens";
import { useTheme } from "../theme/theme";

type AppTextVariant = "display" | "title" | "body" | "label" | "caption";

type AppTextProps = TextProps & {
  variant?: AppTextVariant;
  color?: "text" | "muted" | "accent" | "danger" | "success";
};

export function AppText(props: AppTextProps) {
  const { variant = "body", color = "text", style, ...rest } = props;
  const colors = useTheme();
  const type = tokens.type[variant];
  const colorMap = {
    text: colors.text,
    muted: colors.textMuted,
    accent: colors.accent,
    danger: colors.danger,
    success: colors.success,
  };

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
