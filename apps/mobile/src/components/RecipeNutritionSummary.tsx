import { StyleSheet, View } from "react-native";
import type { RecipeMacros, RecipeNutrition } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type RecipeNutritionSummaryProps = {
  nutrition?: RecipeNutrition | null;
};

export function RecipeNutritionSummary(props: RecipeNutritionSummaryProps) {
  const { nutrition } = props;
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color="muted">
        Macros (approx.)
      </AppText>
      {nutrition ? (
        <View style={styles.grid}>
          <MacroColumn title={`Per ${nutrition.servingG} g`} macros={nutrition.perServing} />
          <MacroColumn title="Per pint" macros={nutrition.perPint} />
        </View>
      ) : (
        <AppText variant="body" color="muted">
          -
        </AppText>
      )}
    </View>
  );
}

function MacroColumn(props: { title: string; macros: RecipeMacros }) {
  const { title, macros } = props;
  return (
    <View style={styles.column}>
      <AppText variant="caption" color="muted">
        {title}
      </AppText>
      <AppText variant="body">{formatKcal(macros.kcal)}</AppText>
      <AppText variant="caption" color="muted">
        {formatGrams(macros.proteinG)} protein · {formatGrams(macros.carbsG)} carbs · {formatGrams(macros.fatG)} fat
      </AppText>
    </View>
  );
}

function formatKcal(value: number): string {
  return `${Math.round(value)} kcal`;
}

function formatGrams(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)} g`;
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
  },
  grid: {
    flexDirection: "row",
    gap: tokens.space.md,
  },
  column: {
    flex: 1,
    gap: tokens.space.xs,
    backgroundColor: tokens.bgElevated,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
  },
});
