import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { NUTRIENT_DISPLAY_GROUPS, type FoodLabelNutrientKey, type NutrientVector } from "@savorly/shared";
import { ApiRequestError, createNutritionFood, parseFoodLabel } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";

const MICRO_GROUPS = NUTRIENT_DISPLAY_GROUPS.filter((group) => group.id === "minerals" || group.id === "vitamins");

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalAmount(value: string): number | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseNumber(trimmed);
  if (parsed == null || parsed < 0) return "invalid";
  return parsed;
}

function amountText(value: number | null | undefined): string {
  return value == null ? "" : String(value);
}

export default function DiaryFoodFormScreen() {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [micros, setMicros] = useState<Partial<Record<FoodLabelNutrientKey, string>>>({});
  const [servingWeight, setServingWeight] = useState("");
  const [paste, setPaste] = useState("");
  const [basisNote, setBasisNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFill() {
    if (paste.trim().length < 8) {
      setError("Paste a bit more of the label.");
      return;
    }
    setFilling(true);
    setError(null);
    try {
      const fill = await parseFoodLabel(paste.trim());
      if (fill.name) setName(fill.name);
      setKcal(amountText(fill.per100g.kcal));
      setProtein(amountText(fill.per100g.proteinG));
      setCarbs(amountText(fill.per100g.carbsG));
      setFat(amountText(fill.per100g.fatG));
      setFiber(amountText(fill.per100g.fiberG));
      setMicros((current) => {
        const next = { ...current };
        for (const group of MICRO_GROUPS) {
          for (const field of group.fields) {
            next[field.key] = amountText(fill.per100g[field.key]);
          }
        }
        return next;
      });
      setServingWeight(fill.servingWeightG != null ? String(fill.servingWeightG) : "");
      setBasisNote(fill.basisNote);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Filling this in needs a connection.");
    } finally {
      setFilling(false);
    }
  }

  async function onSave() {
    const per100g: NutrientVector = {
      kcal: parseNumber(kcal) ?? Number.NaN,
      proteinG: parseNumber(protein) ?? Number.NaN,
      carbsG: parseNumber(carbs) ?? Number.NaN,
      fatG: parseNumber(fat) ?? Number.NaN,
    };
    if (!name.trim() || [per100g.kcal, per100g.proteinG, per100g.carbsG, per100g.fatG].some((item) => !Number.isFinite(item))) {
      setError("Name and per-100 g calories, protein, carbs, and fat are required.");
      return;
    }
    const fiberG = optionalAmount(fiber);
    const servingWeightG = optionalAmount(servingWeight);
    if (servingWeightG === "invalid") {
      setError("Enter grams per serving as a number, or leave it blank.");
      return;
    }
    if (fiberG === "invalid") {
      setError("Enter fiber as a number, or leave it blank.");
      return;
    }
    if (fiberG != null) per100g.fiberG = fiberG;
    for (const group of MICRO_GROUPS) {
      for (const field of group.fields) {
        const amount = optionalAmount(micros[field.key] ?? "");
        if (amount === "invalid") {
          setError("Enter vitamins and minerals as numbers, or leave them blank.");
          return;
        }
        if (amount != null) per100g[field.key] = amount;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await createNutritionFood(name, per100g, servingWeightG);
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save food.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">Manual food</AppText>
      <AppText variant="body" color="muted">
        Enter nutrition per 100 g. Diary amounts scale from this row.
      </AppText>
      <Field label="Paste label" value={paste} onChangeText={setPaste} placeholder="Paste a nutrition label" multiline />
      <Button size="compact" label="Fill from text" variant="secondary" onPress={() => void onFill()} loading={filling} />
      {basisNote ? (
        <AppText variant="body" color="muted">
          {basisNote}
        </AppText>
      ) : null}
      <Field label="Name" value={name} onChangeText={setName} placeholder="Peanut butter" />
      <Field
        label="Grams per serving (optional)"
        value={servingWeight}
        onChangeText={setServingWeight}
        keyboardType="numeric"
        placeholder="32"
      />
      <Field label="kcal / 100 g" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
      <Field label="Protein g / 100 g" value={protein} onChangeText={setProtein} keyboardType="numeric" />
      <Field label="Carbs g / 100 g" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
      <Field label="Fat g / 100 g" value={fat} onChangeText={setFat} keyboardType="numeric" />
      <Field label="Fiber g / 100 g (optional)" value={fiber} onChangeText={setFiber} keyboardType="numeric" />
      {MICRO_GROUPS.map((group) => (
        <View key={group.id} style={styles.group}>
          <AppText variant="title">{group.labelKey}</AppText>
          {group.fields.map((field) => (
            <Field
              key={field.key}
              label={`${field.labelKey} ${field.unit} / 100 g (optional)`}
              value={micros[field.key] ?? ""}
              onChangeText={(value) => setMicros((current) => ({ ...current, [field.key]: value }))}
              keyboardType="numeric"
            />
          ))}
        </View>
      ))}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button size="compact" label="Save food" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: tokens.space.md,
  },
});
