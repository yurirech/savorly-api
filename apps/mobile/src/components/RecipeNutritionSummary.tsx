import { StyleSheet, View } from "react-native";
import type { RecipeMacros, RecipeNutrition } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { softWrapText } from "../utils/textWrap";
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
          {nutrition.perPint ? (
            <>
              <MacroColumn title={`Per ${nutrition.servingG} g`} macros={nutrition.perServing} />
              <MacroColumn title="Per pint" macros={nutrition.perPint} />
            </>
          ) : (
            <>
              <MacroColumn title={`Per serving (${nutrition.servingG} g)`} macros={nutrition.perServing} />
              <MacroColumn title="Per 100 g" macros={macrosPer100g(nutrition)} />
            </>
          )}
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
      <AppText variant="caption" color="muted" style={styles.columnTitle}>
        {softWrapText(title)}
      </AppText>
      <AppText variant="body">{formatKcal(macros.kcal)}</AppText>
      <AppText variant="caption" color="muted" style={styles.macroLine}>
        {softWrapText(
          `${formatGrams(macros.proteinG)} protein · ${formatGrams(macros.carbsG)} carbs · ${formatGrams(macros.fatG)} fat`,
        )}
      </AppText>
    </View>
  );
}

function macrosPer100g(nutrition: RecipeNutrition): RecipeMacros {
  if (nutrition.servingG === 100) return nutrition.perServing;
  const factor = 100 / nutrition.servingG;
  return {
    kcal: roundMacro(nutrition.perServing.kcal * factor),
    proteinG: roundMacro(nutrition.perServing.proteinG * factor),
    carbsG: roundMacro(nutrition.perServing.carbsG * factor),
    fatG: roundMacro(nutrition.perServing.fatG * factor),
  };
}

function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
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
    flexBasis: 0,
    minWidth: 0,
    gap: tokens.space.xs,
    backgroundColor: tokens.bgElevated,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
  },
  columnTitle: {
    width: "100%",
  },
  macroLine: {
    width: "100%",
  },
});
