import { router } from "expo-router";
import { useState } from "react";
import type { NutrientVector } from "@savorly/shared";
import { ApiRequestError, createNutritionFood } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DiaryFoodFormScreen() {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const fiberG = parseNumber(fiber);
    if (fiberG != null) {
      per100g.fiberG = fiberG;
    }
    setSaving(true);
    setError(null);
    try {
      await createNutritionFood(name, per100g);
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
      <Field label="Name" value={name} onChangeText={setName} placeholder="Peanut butter" />
      <Field label="kcal / 100 g" value={kcal} onChangeText={setKcal} keyboardType="numeric" />
      <Field label="Protein g / 100 g" value={protein} onChangeText={setProtein} keyboardType="numeric" />
      <Field label="Carbs g / 100 g" value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
      <Field label="Fat g / 100 g" value={fat} onChangeText={setFat} keyboardType="numeric" />
      <Field label="Fiber g / 100 g (optional)" value={fiber} onChangeText={setFiber} keyboardType="numeric" />
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Save food" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}
