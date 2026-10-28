import { StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { useTheme, useThemedStyles, type ThemeColors } from "../theme/theme";
import { tokens } from "../theme/tokens";

interface CategoryPillProps {
  category: string;
}

function CategoryPill(props: CategoryPillProps) {
  const { category } = props;
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const highlights = [colors.yellow, colors.orange, colors.violet, colors.mint];
  let hash = 0;
  for (const char of category) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  const color = highlights[hash % highlights.length] ?? colors.yellow;

  return (
    <View style={[styles.pill, { backgroundColor: color }]}>
      <AppText variant="caption" style={styles.label} numberOfLines={1}>
        {category}
      </AppText>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pill: {
      borderRadius: tokens.radius.full,
      paddingHorizontal: tokens.space.sm,
      paddingVertical: 2,
      maxWidth: 120,
    },
    label: {
      color: colors.onAccent,
    },
  });
}

export default CategoryPill;
