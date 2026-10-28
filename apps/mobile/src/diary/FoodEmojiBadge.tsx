import { StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";
import { useThemedStyles, type ThemeColors } from "../theme/theme";

interface FoodEmojiBadgeProps {
  emoji: string;
  muted?: boolean;
}

function FoodEmojiBadge(props: FoodEmojiBadgeProps) {
  const styles = useThemedStyles(createStyles);

  const { emoji, muted } = props;
  return (
    <View style={[styles.badge, muted && styles.muted]} accessibilityElementsHidden importantForAccessibility="no">
      <AppText variant="body" style={styles.emoji}>
        {emoji}
      </AppText>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  badge: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: colors.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    backgroundColor: colors.bgElevated,
    opacity: 0.6,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
});
}


export default FoodEmojiBadge;
