import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import {
  computeNutritionTargets,
  dayIntakeTargets,
  formatDiaryNumber,
  MICRO_TARGET_FIELDS,
  MICRO_TARGET_KEYS,
  parseMicroTargets,
  type DayIntakeTargets,
  type MicroTargetKey,
  type MicroTargets,
  type NutritionActivity,
  type NutritionGoal,
  type NutritionProfileWrite,
  type NutritionSex,
  type NutritionTargets,
} from "@savorly/shared";
import { ApiRequestError, fetchNutritionProfile, saveNutritionProfile } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { tokens } from "../../../src/theme/tokens";
import { useThemedStyles, type ThemeColors } from "../../../src/theme/theme";

function parseNumber(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function draftsFromIntakes(intakes: DayIntakeTargets): Record<MicroTargetKey, string> {
  return Object.fromEntries(
    MICRO_TARGET_KEYS.map((key) => [key, formatDiaryNumber(intakes[key])]),
  ) as Record<MicroTargetKey, string>;
}

function overridesFromDrafts(
  drafts: Record<MicroTargetKey, string>,
  loadedDefaults: DayIntakeTargets,
  loadedOverrides: MicroTargets | null,
  nextDefaults: DayIntakeTargets,
): MicroTargets | null {
  const next: MicroTargets = {};
  for (const key of MICRO_TARGET_KEYS) {
    const parsed = parseNumber(drafts[key] ?? "");
    if (parsed == null || parsed <= 0) {
      continue;
    }
    const rounded = Number(formatDiaryNumber(parsed));
    const leftAtLoadedDefault = rounded === loadedDefaults[key] && loadedOverrides?.[key] == null;
    if (leftAtLoadedDefault || rounded === nextDefaults[key]) {
      continue;
    }
    next[key] = rounded;
  }
  return parseMicroTargets(next);
}

export default function DiaryProfileScreen() {
  const styles = useThemedStyles(createStyles);

  const [sex, setSex] = useState<NutritionSex>("male");
  const [age, setAge] = useState("30");
  const [heightCm, setHeightCm] = useState("180");
  const [weightKg, setWeightKg] = useState("80");
  const [activity, setActivity] = useState<NutritionActivity>("sedentary");
  const [goal, setGoal] = useState<NutritionGoal>("maintain");
  const [weeklyKgChange, setWeeklyKgChange] = useState("0.5");
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [microDrafts, setMicroDrafts] = useState<Record<MicroTargetKey, string>>(() =>
    draftsFromIntakes(dayIntakeTargets(null, "male")),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef<{ defaults: DayIntakeTargets; overrides: MicroTargets | null }>({
    defaults: dayIntakeTargets(null, "male"),
    overrides: null,
  });

  useFocusEffect(
    useCallback(() => {
      void fetchNutritionProfile()
        .then((live) => {
          const nextSex = live.profile?.sex ?? "male";
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
          const defaults = dayIntakeTargets(live.targets, nextSex);
          const merged = live.intakeTargets ?? defaults;
          loadedRef.current = {
            defaults,
            overrides: live.profile?.microTargets ?? null,
          };
          setMicroDrafts(draftsFromIntakes(merged));
        })
        .catch((err) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not load profile.");
        });
    }, []),
  );

  async function onSave() {
    const body: NutritionProfileWrite = {
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
    const nextTargets = computeNutritionTargets(body);
    const nextDefaults = dayIntakeTargets(nextTargets, body.sex);
    body.microTargets = overridesFromDrafts(
      microDrafts,
      loadedRef.current.defaults,
      loadedRef.current.overrides,
      nextDefaults,
    );
    setSaving(true);
    setError(null);
    try {
      const live = await saveNutritionProfile(body);
      setTargets(live.targets);
      const defaults = dayIntakeTargets(live.targets, live.profile?.sex ?? body.sex);
      loadedRef.current = {
        defaults,
        overrides: live.profile?.microTargets ?? null,
      };
      setMicroDrafts(draftsFromIntakes(live.intakeTargets ?? defaults));
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
      <AppText variant="title">Micronutrients</AppText>
      <AppText variant="body" color="muted">
        Defaults come from your calorie target and sex. Edit a value to override it.
      </AppText>
      <View style={styles.microGrid}>
        {MICRO_TARGET_FIELDS.map((field) => (
          <View key={field.key} style={styles.microField}>
            <AppText variant="caption" color="muted">
              {field.label} ({field.unit})
            </AppText>
            <TextInput
              value={microDrafts[field.key] ?? ""}
              onChangeText={(value) => setMicroDrafts((current) => ({ ...current, [field.key]: value }))}
              keyboardType="numeric"
              accessibilityLabel={field.label}
              style={styles.microInput}
            />
          </View>
        ))}
      </View>
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      <Button size="compact" label="Save targets" onPress={() => void onSave()} loading={saving} />
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  microGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  microField: {
    width: "48%",
    flexGrow: 1,
    gap: tokens.space.xs,
  },
  microInput: {
    color: colors.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    minHeight: 44,
  },
});
}

