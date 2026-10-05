import { StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { tokens } from "../theme/tokens";

interface FoodEmojiBadgeProps {
  emoji: string;
  muted?: boolean;
}

function FoodEmojiBadge(props: FoodEmojiBadgeProps) {
  const { emoji, muted } = props;
  return (
    <View style={[styles.badge, muted && styles.muted]} accessibilityElementsHidden importantForAccessibility="no">
      <AppText variant="body" style={styles.emoji}>
        {emoji}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.accentMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    backgroundColor: tokens.bgElevated,
    opacity: 0.6,
  },
  emoji: {
    fontSize: 20,
    lineHeight: 26,
  },
});

export default FoodEmojiBadge;
