import { useTheme, useThemedStyles, type ThemeColors } from "../theme/theme";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretRight } from "phosphor-react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type SourceCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
  icon?: ReactNode;
};

export function SourceCard(props: SourceCardProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  const { title, subtitle, onPress, icon } = props;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.copy}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="caption" color="muted">
          {subtitle}
        </AppText>
      </View>
      <CaretRight size={20} color={colors.accent} weight="bold" />
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    minHeight: 80,
  },
  pressed: {
    borderColor: colors.accent,
    backgroundColor: colors.bgElevated,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.sm,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
});
}

