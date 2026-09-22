import { Check, X } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { RecipePantryMatchResult } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type RecipePantryStatusProps = {
  match: RecipePantryMatchResult | null;
  loading: boolean;
  hasStaples: boolean;
  onPressMissing: () => void;
};

export function RecipePantryStatus(props: RecipePantryStatusProps) {
  const { match, loading, hasStaples, onPressMissing } = props;

  if (loading) {
    return (
      <AppText variant="caption" color="muted">
        Checking pantry…
      </AppText>
    );
  }

  if (!hasStaples) {
    return (
      <AppText variant="caption" color="muted">
        Add staples in Pantry to compare ingredients.
      </AppText>
    );
  }

  if (!match) {
    return null;
  }

  if (match.isComplete) {
    return (
      <View style={styles.row}>
        <Check size={18} color={tokens.success} weight="bold" />
        <AppText variant="caption" style={{ color: tokens.success }}>
          All ingredients in your pantry
        </AppText>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPressMissing}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel="Show missing pantry ingredients"
    >
      <X size={18} color={tokens.danger} weight="bold" />
      <AppText variant="caption" style={{ color: tokens.danger }}>
        Missing {match.missingIngredients.length} of {match.totalCount}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    flexShrink: 1,
  },
});
