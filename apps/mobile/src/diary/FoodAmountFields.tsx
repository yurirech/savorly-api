import { Pressable, StyleSheet, View } from "react-native";
import { convertFoodAmount, type FoodAmountUnit } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Field } from "../components/Field";
import { SegmentedControl } from "../components/SegmentedControl";
import { tokens } from "../theme/tokens";

export function parseFoodAmount(value: string): number | null {
  const amount = Number(value.replace(",", "."));
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export function formatAmount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(Math.round(value * 100) / 100);
}

interface FoodAmountFieldsProps {
  unit: FoodAmountUnit;
  amount: string;
  servingWeightG: number | null;
  frequentGrams: number[];
  onUnitChange: (unit: FoodAmountUnit) => void;
  onAmountChange: (value: string) => void;
}

function FoodAmountFields(props: FoodAmountFieldsProps) {
  const { unit, amount, servingWeightG, frequentGrams, onUnitChange, onAmountChange } = props;
  const hasServing = servingWeightG != null && servingWeightG > 0;

  return (
    <>
      {hasServing ? (
        <SegmentedControl
          value={unit}
          onChange={(next) => {
            const parsed = parseFoodAmount(amount);
            const converted =
              parsed == null ? null : convertFoodAmount(parsed, unit, next, servingWeightG);
            onUnitChange(next);
            if (converted != null) {
              onAmountChange(formatAmount(converted));
            }
          }}
          options={[
            { value: "grams", label: "Grams" },
            { value: "servings", label: "Servings" },
          ]}
        />
      ) : null}
      <Field
        label={unit === "servings" ? "Servings" : "Grams"}
        value={amount}
        onChangeText={onAmountChange}
        keyboardType="numeric"
        placeholder={unit === "servings" ? "1" : "100"}
      />
      {hasServing ? (
        <AppText variant="caption" color="muted">
          1 serving = {servingWeightG} g
        </AppText>
      ) : null}
      {frequentGrams.length > 0 ? (
        <View style={styles.quickRow}>
          <AppText variant="label" color="muted">
            Often logged
          </AppText>
          <View style={styles.chips}>
            {frequentGrams.map((value) => (
              <Pressable
                key={`g-${value}`}
                onPress={() => {
                  onUnitChange("grams");
                  onAmountChange(String(value));
                }}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={`${value} grams`}
              >
                <AppText variant="caption">{value} g</AppText>
              </Pressable>
            ))}
            {hasServing ? (
              <>
                <Pressable
                  onPress={() => {
                    onUnitChange("servings");
                    onAmountChange("1");
                  }}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel="1 serving"
                >
                  <AppText variant="caption">1 serving</AppText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    onUnitChange("servings");
                    onAmountChange("2");
                  }}
                  style={styles.chip}
                  accessibilityRole="button"
                  accessibilityLabel="2 servings"
                >
                  <AppText variant="caption">2 servings</AppText>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      ) : null}
      {frequentGrams.length === 0 && hasServing ? (
        <View style={styles.chips}>
          <Pressable
            onPress={() => {
              onUnitChange("servings");
              onAmountChange("1");
            }}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel="1 serving"
          >
            <AppText variant="caption">1 serving</AppText>
          </Pressable>
          <Pressable
            onPress={() => {
              onUnitChange("servings");
              onAmountChange("2");
            }}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel="2 servings"
          >
            <AppText variant="caption">2 servings</AppText>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  quickRow: {
    gap: tokens.space.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
  },
});

export default FoodAmountFields;
