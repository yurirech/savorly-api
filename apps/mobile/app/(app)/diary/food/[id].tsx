import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  hasExtendedNutrients,
  listPresentNutrients,
  NEVO_ATTRIBUTION,
  type UserFood,
} from "@savorly/shared";
import {
  ApiRequestError,
  deleteNutritionFood,
  fetchNutritionFood,
  listNutritionFoods,
} from "../../../../src/api/client";
import { AppText } from "../../../../src/components/AppText";
import { Button } from "../../../../src/components/Button";
import NutrientDetailList from "../../../../src/components/NutrientDetailList";
import { Screen } from "../../../../src/components/Screen";
import { clearCachedFood, getCachedFood } from "../../../../src/diary/foodDetailCache";
import { tokens } from "../../../../src/theme/tokens";
import { todayIsoDate } from "../../../../src/utils/isoDate";

function sourceLabel(source: UserFood["source"]): string {
  if (source === "nevo") return "NEVO";
  if (source === "usda") return "USDA";
  return "Manual";
}

async function loadFoodFromList(id: string): Promise<UserFood | null> {
  const live = await listNutritionFoods();
  return live.foods.find((item) => item.id === id) ?? null;
}

export default function DiaryFoodDetailScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [food, setFood] = useState<UserFood | null>(null);
  const [attribution, setAttribution] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const nutrientGroups = useMemo(
    () => (food ? listPresentNutrients(food.per100g) : []),
    [food],
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) {
        setError("Food not found.");
        return;
      }

      const cached = getCachedFood(id);
      if (cached) {
        setFood(cached);
        setError(null);
      }

      void (async () => {
        try {
          const live = await fetchNutritionFood(id);
          setFood(live.food);
          setAttribution(live.attribution);
          setError(null);
          return;
        } catch {
          if (cached) {
            setError(null);
            return;
          }

          try {
            const fromList = await loadFoodFromList(id);
            if (fromList) {
              setFood(fromList);
              setError(null);
              return;
            }
          } catch (listErr) {
            setError(listErr instanceof ApiRequestError ? listErr.message : "Could not load that food.");
            return;
          }

          setError("Food not found.");
        }
      })();
    }, [id]),
  );

  async function onDelete() {
    if (!food) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteNutritionFood(food.id);
      clearCachedFood(food.id);
      router.back();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not delete that food.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <AppText variant="display">{food?.name ?? "Food"}</AppText>
      {food ? (
        <>
          <AppText variant="caption" color="muted">
            {sourceLabel(food.source)}
            {food.nevoCode != null ? ` · NEVO ${food.nevoCode}` : ""}
            {food.fdcId != null ? ` · FDC ${food.fdcId}` : ""}
          </AppText>
          <AppText variant="title">Per 100 g</AppText>
          <View style={styles.macros}>
            <MacroCell label="kcal" value={food.per100g.kcal} />
            <MacroCell label="Protein" value={`${food.per100g.proteinG} g`} />
            <MacroCell label="Carbs" value={`${food.per100g.carbsG} g`} />
            <MacroCell label="Fat" value={`${food.per100g.fatG} g`} />
          </View>
          {nutrientGroups.length > 0 ? <NutrientDetailList groups={nutrientGroups} /> : null}
          {food.source === "nevo" && !hasExtendedNutrients(food.per100g) ? (
            <AppText variant="caption" color="muted">
              Full NEVO nutrients appear after re-importing this food.
            </AppText>
          ) : null}
          <Button
            label="Log food"
            onPress={() =>
              router.push({
                pathname: "/(app)/diary/log",
                params: { date: todayIsoDate(), foodId: food.id },
              } as Href)
            }
          />
          <Button label="Delete" variant="secondary" onPress={() => void onDelete()} loading={deleting} />
        </>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {(attribution || food?.source === "nevo") && (
        <AppText variant="caption" color="muted">
          {attribution ?? NEVO_ATTRIBUTION}
        </AppText>
      )}
    </Screen>
  );
}

type MacroCellProps = {
  label: string;
  value: string | number;
};

function MacroCell(props: MacroCellProps) {
  const { label, value } = props;
  return (
    <View style={styles.macro}>
      <AppText variant="caption" color="muted">
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  macros: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.md,
  },
  macro: {
    flexGrow: 1,
    minWidth: "40%",
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
});
