import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import type { NutritionActivity, NutritionGoal, NutritionProfileInput, NutritionSex, NutritionTargets } from "@savorly/shared";
import { ApiRequestError, fetchNutritionProfile, saveNutritionProfile } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function DiaryProfileScreen() {
  const [sex, setSex] = useState<NutritionSex>("male");
  const [age, setAge] = useState("30");
  const [heightCm, setHeightCm] = useState("180");
  const [weightKg, setWeightKg] = useState("80");
  const [activity, setActivity] = useState<NutritionActivity>("sedentary");
  const [goal, setGoal] = useState<NutritionGoal>("maintain");
  const [weeklyKgChange, setWeeklyKgChange] = useState("0.5");
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchNutritionProfile()
        .then((live) => {
          if (live.profile) {
            setSex(live.profile.sex);
            setAge(String(live.profile.age));
            setHeightCm(String(live.profile.heightCm));
            setWeightKg(String(live.profile.weightKg));
            setActivity(live.profile.activity);
            setGoal(live.profile.goal);
            setWeeklyKgChange(String(live.profile.weeklyKgChange || 0.5));
          }
          setTargets(live.targets);
        })
        .catch((err) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not load profile.");
        });
    }, []),
  );

  async function onSave() {
    const body: NutritionProfileInput = {
      sex,
      age: parseNumber(age) ?? Number.NaN,
      heightCm: parseNumber(heightCm) ?? Number.NaN,
      weightKg: parseNumber(weightKg) ?? Number.NaN,
      activity,
      goal,
      weeklyKgChange: goal === "maintain" ? 0 : (parseNumber(weeklyKgChange) ?? 0),
    };
    if ([body.age, body.heightCm, body.weightKg].some((item) => !Number.isFinite(item))) {
      setError("Age, height, and weight are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const live = await saveNutritionProfile(body);
      setTargets(live.targets);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">Targets</AppText>
      <AppText variant="body" color="muted">
        Calories come from height, weight, activity, and whether you want a deficit or surplus.
      </AppText>
      <AppText variant="label" color="muted">
        Sex
      </AppText>
      <SegmentedControl
        value={sex}
        onChange={setSex}
        options={[
          { value: "male", label: "Male" },
          { value: "female", label: "Female" },
        ]}
      />
      <Field label="Age" value={age} onChangeText={setAge} keyboardType="numeric" />
      <Field label="Height (cm)" value={heightCm} onChangeText={setHeightCm} keyboardType="numeric" />
      <Field label="Weight (kg)" value={weightKg} onChangeText={setWeightKg} keyboardType="numeric" />
      <AppText variant="label" color="muted">
        Activity
      </AppText>
      <SegmentedControl
        value={activity}
        onChange={setActivity}
        options={[
          { value: "sedentary", label: "Sit" },
          { value: "light", label: "Light" },
          { value: "moderate", label: "Mod" },
          { value: "active", label: "Active" },
        ]}
      />
      <AppText variant="label" color="muted">
        Goal
      </AppText>
      <SegmentedControl
        value={goal}
        onChange={setGoal}
        options={[
          { value: "lose", label: "Lose" },
          { value: "maintain", label: "Hold" },
          { value: "gain", label: "Gain" },
        ]}
      />
      {goal !== "maintain" ? (
        <Field
          label="Weekly change (kg)"
          value={weeklyKgChange}
          onChangeText={setWeeklyKgChange}
          keyboardType="numeric"
        />
      ) : null}
      {targets ? (
        <AppText variant="body">
          {targets.kcal} kcal · {targets.proteinG}g P · {targets.carbsG}g C · {targets.fatG}g F
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button label="Save targets" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}
