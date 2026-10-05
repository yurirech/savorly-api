import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Check, DotsThreeVertical, FunnelSimple } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { foodMatchesQuery, type NevoFoodHit, type UsdaFoodHit, type UserFood } from "@savorly/shared";
import {
  addDiaryEntry,
  ApiRequestError,
  createDiaryMeal,
  deleteNutritionFood,
  fetchDiaryDay,
  fetchFrequentGrams,
  importNevoFood,
  importUsdaFood,
  listNutritionFoods,
  searchNevoFoods,
  searchUsdaFoods,
  updateNutritionRecipeItem,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import ContextMenu, {
  measureContextMenuAnchor,
  type ContextMenuAnchor,
} from "../../../src/components/ContextMenu";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { setCachedFood } from "../../../src/diary/foodDetailCache";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../src/diary/DiaryMealPickerSheet";
import { resolveMealForDate, writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
import { tokens } from "../../../src/theme/tokens";
import { confirmDestructive } from "../../../src/utils/confirmDestructive";
import { todayIsoDate } from "../../../src/utils/isoDate";
import type { DiaryMealGroup } from "@savorly/shared";

function mergeFoods(current: UserFood[], incoming: UserFood[]): UserFood[] {
  const byId = new Map(current.map((food) => [food.id, food]));
  for (const food of incoming) {
    byId.set(food.id, food);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sourceCaption(source: UserFood["source"]): string {
  if (source === "nevo") return "NEVO";
  if (source === "usda") return "USDA";
  if (source === "recipe") return "Recipe";
  return "Manual";
}

type CatalogFilter = "library" | "nevo" | "usda";
type LibraryTab = "all" | "mine" | "recipes";

const CATALOG_FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: "library", label: "Library" },
  { value: "nevo", label: "NEVO" },
  { value: "usda", label: "USDA" },
];

const LIBRARY_TABS: { value: LibraryTab; label: string }[] = [
  { value: "all", label: "All foods" },
  { value: "mine", label: "My foods" },
  { value: "recipes", label: "My recipes" },
];

export default function DiaryFoodsScreen() {
  const params = useLocalSearchParams<{ date?: string; mealId?: string; nutritionRecipeId?: string; itemId?: string }>();
  const date = firstParam(params.date) ?? todayIsoDate();
  const mealIdParam = firstParam(params.mealId);
  const nutritionRecipeId = firstParam(params.nutritionRecipeId);
  const recipeItemId = firstParam(params.itemId);

  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<LibraryTab>("all");
  const [filter, setFilter] = useState<CatalogFilter>("library");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => new Set());
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [meals, setMeals] = useState<DiaryMealGroup[]>([]);
  const [boundMeal, setBoundMeal] = useState<{ id: string; name: string } | null>(null);
  const [pendingFood, setPendingFood] = useState<UserFood | null>(null);
  const [mealPickerVisible, setMealPickerVisible] = useState(false);
  const [createMealVisible, setCreateMealVisible] = useState(false);
  const [mealSaving, setMealSaving] = useState(false);
  const [nevoHits, setNevoHits] = useState<NevoFoodHit[]>([]);
  const [usdaHits, setUsdaHits] = useState<UsdaFoodHit[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    try {
      const live = await listNutritionFoods();
      setFoods(live.foods);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
    }
  }, []);

  const loadMealContext = useCallback(async () => {
    try {
      const day = await fetchDiaryDay(date);
      setMeals(day.meals);
      if (mealIdParam) {
        const meal = day.meals.find((row) => row.id === mealIdParam);
        setBoundMeal(meal ? { id: meal.id, name: meal.name } : null);
        return;
      }
      const last = await resolveMealForDate(date);
      setBoundMeal(last);
    } catch {
      setBoundMeal(mealIdParam ? { id: mealIdParam, name: "Meal" } : null);
    }
  }, [date, mealIdParam]);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
      void loadMealContext();
    }, [loadLibrary, loadMealContext]),
  );

  useEffect(() => {
    const term = query.trim();
    if (!term || filter !== "library") return;
    const handle = setTimeout(() => {
      void listNutritionFoods(term)
        .then((live) => {
          setFoods((current) => mergeFoods(current, live.foods));
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [filter, query]);

  useEffect(() => {
    const term = query.trim();
    if (filter === "library") return;
    if (!term) {
      setNevoHits([]);
      setUsdaHits([]);
      return;
    }
    const handle = setTimeout(() => {
      setCatalogLoading(true);
      setError(null);
      const search = filter === "nevo" ? searchNevoFoods(term) : searchUsdaFoods(term);
      void search
        .then((live) => {
          if (filter === "nevo") {
            setNevoHits(live.foods as NevoFoodHit[]);
            setUsdaHits([]);
            if (live.foods.length === 0) setError('Geen match. Probeer “halfvolle melk” of “havermout”.');
          } else {
            setUsdaHits(live.foods as UsdaFoodHit[]);
            setNevoHits([]);
            if (live.foods.length === 0) setError("No generics matched. Try “milk nonfat” or “peanut butter”.");
          }
        })
        .catch((err: unknown) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not search.");
        })
        .finally(() => setCatalogLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [filter, query]);

  const searched = foods.filter((food) => foodMatchesQuery(food, query));
  const visible =
    tab === "all" ? searched : searched.filter((food) => (food.source === "recipe") === (tab === "recipes"));

  function openFood(food: UserFood) {
    setCachedFood(food);
    if (nutritionRecipeId && recipeItemId) {
      void updateNutritionRecipeItem(nutritionRecipeId, recipeItemId, { foodId: food.id })
        .then(() => router.back())
        .catch((err: unknown) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not link that food.");
        });
      return;
    }
    if (nutritionRecipeId) {
      router.navigate({
        pathname: "/(app)/diary/nutrition-recipe/[id]",
        params: { id: nutritionRecipeId, addFoodId: food.id },
      });
      return;
    }
    if (food.source === "recipe" && food.nutritionRecipeId) {
      router.push(`/(app)/diary/nutrition-recipe/${food.nutritionRecipeId}` as Href);
      return;
    }
    router.push({
      pathname: `/(app)/diary/food/${food.id}`,
      params: {
        date,
        ...(boundMeal ? { mealId: boundMeal.id } : {}),
        returnTo: "foods",
      },
    } as Href);
  }

  async function gramsForFood(foodId: string): Promise<number> {
    try {
      const freq = await fetchFrequentGrams(foodId);
      return freq.grams[0] ?? 100;
    } catch {
      return 100;
    }
  }

  async function logFoodToMeal(food: UserFood, targetMealId: string) {
    const grams = await gramsForFood(food.id);
    await addDiaryEntry(targetMealId, food.id, grams, date);
    const meal = meals.find((row) => row.id === targetMealId);
    if (meal) {
      await writeLastDiaryMeal({ mealId: meal.id, mealName: meal.name, date });
      setBoundMeal({ id: meal.id, name: meal.name });
    }
  }

  async function onCheckFood(food: UserFood) {
    if (checkedIds.has(food.id)) {
      setCheckedIds((current) => {
        const next = new Set(current);
        next.delete(food.id);
        return next;
      });
      return;
    }
    if (nutritionRecipeId) return;
    setLoggingId(food.id);
    setError(null);
    try {
      if (boundMeal) {
        await logFoodToMeal(food, boundMeal.id);
        setCheckedIds((current) => new Set(current).add(food.id));
      } else {
        const day = await fetchDiaryDay(date);
        setMeals(day.meals);
        setPendingFood(food);
        setMealPickerVisible(true);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not log that food.");
    } finally {
      setLoggingId(null);
    }
  }

  function onDeleteFood(food: UserFood) {
    confirmDestructive("Delete food", `Remove ${food.name} from My foods?`, "Delete", () => {
      void deleteNutritionFood(food.id)
        .then(() => {
          setFoods((current) => current.filter((item) => item.id !== food.id));
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof ApiRequestError ? err.message : "Could not delete that food.");
        });
    });
  }

  async function onImportNevo(hit: NevoFoodHit) {
    setImportingKey(`nevo-${hit.nevoCode}`);
    setError(null);
    try {
      const saved = await importNevoFood(hit.nevoCode, hit.nameEn || hit.name);
      setFoods((current) => mergeFoods(current, [saved.food]));
      if (nutritionRecipeId && recipeItemId) {
        await updateNutritionRecipeItem(nutritionRecipeId, recipeItemId, { foodId: saved.food.id });
        router.back();
        return;
      }
      if (nutritionRecipeId) {
        router.navigate({
          pathname: "/(app)/diary/nutrition-recipe/[id]",
          params: { id: nutritionRecipeId, addFoodId: saved.food.id },
        });
        return;
      }
      openFood(saved.food);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not import that food.");
    } finally {
      setImportingKey(null);
    }
  }

  async function onImportUsda(hit: UsdaFoodHit) {
    setImportingKey(`usda-${hit.fdcId}`);
    setError(null);
    try {
      const saved = await importUsdaFood(hit.fdcId, hit.name);
      setFoods((current) => mergeFoods(current, [saved.food]));
      if (nutritionRecipeId && recipeItemId) {
        await updateNutritionRecipeItem(nutritionRecipeId, recipeItemId, { foodId: saved.food.id });
        router.back();
        return;
      }
      if (nutritionRecipeId) {
        router.navigate({
          pathname: "/(app)/diary/nutrition-recipe/[id]",
          params: { id: nutritionRecipeId, addFoodId: saved.food.id },
        });
        return;
      }
      openFood(saved.food);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not import that food.");
    } finally {
      setImportingKey(null);
    }
  }

  return (
    <Screen
      header={
        <>
          <View style={styles.titleRow}>
            <AppText variant="display">My foods</AppText>
            <Button
              size="compact"
              label="Add manually"
              variant="secondary"
              onPress={() => router.push("/(app)/diary/food-form" as Href)}
            />
          </View>
          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <Field
                label={
                  filter === "nevo" ? "Search NEVO" : filter === "usda" ? "Search USDA" : "Search my foods"
                }
                value={query}
                onChangeText={setQuery}
                variant="search"
              />
            </View>
            <Pressable
              onPress={() => setFiltersOpen((open) => !open)}
              style={[styles.filterButton, (filtersOpen || filter !== "library" || tab !== "all") && styles.filterButtonOn]}
              accessibilityRole="button"
              accessibilityState={{ expanded: filtersOpen }}
              accessibilityLabel="Filters"
            >
              <FunnelSimple
                size={20}
                color={filter !== "library" || tab !== "all" ? tokens.accent : tokens.text}
                weight={filter !== "library" || tab !== "all" ? "fill" : "regular"}
              />
            </Pressable>
          </View>
          {filtersOpen ? (
            <View style={styles.filterPanel}>
              <View style={styles.filterGroup}>
                {CATALOG_FILTERS.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => setFilter(option.value)}
                    style={[styles.filterChip, filter === option.value && styles.filterChipOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === option.value }}
                    accessibilityLabel={option.label}
                  >
                    <AppText
                      variant="caption"
                      style={filter === option.value ? styles.filterChipLabelOn : styles.filterChipLabel}
                    >
                      {option.label}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {filter === "library" ? (
                <View style={styles.filterGroup}>
                  {LIBRARY_TABS.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setTab(option.value)}
                      style={[styles.filterChip, tab === option.value && styles.filterChipOn]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: tab === option.value }}
                      accessibilityLabel={option.label}
                    >
                      <AppText
                        variant="caption"
                        style={tab === option.value ? styles.filterChipLabelOn : styles.filterChipLabel}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      }
    >
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {filter === "library" && visible.length === 0 ? (
        <AppText variant="body" color="muted">
          Nothing saved yet. Import skim milk or add peanut butter by hand.
        </AppText>
      ) : null}
      {filter === "library"
        ? visible.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              caption={`${food.per100g.kcal} kcal / 100 g · ${sourceCaption(food.source)}`}
              checked={checkedIds.has(food.id)}
              checking={loggingId === food.id}
              showCheck={!nutritionRecipeId}
              onCheck={() => void onCheckFood(food)}
              onOpen={() => openFood(food)}
              onDelete={() => onDeleteFood(food)}
            />
          ))
        : null}
      {filter === "nevo" && !query.trim() ? (
        <AppText variant="body" color="muted">
          Search Dutch generics, then log from the profile.
        </AppText>
      ) : null}
      {filter === "usda" && !query.trim() ? (
        <AppText variant="body" color="muted">
          Search US staples, then log from the profile.
        </AppText>
      ) : null}
      {catalogLoading ? (
        <AppText variant="body" color="muted">
          Searching…
        </AppText>
      ) : null}
      {filter === "nevo"
        ? nevoHits.map((hit) => (
            <CatalogRow
              key={hit.nevoCode}
              title={hit.nameEn || hit.name}
              caption={hit.nameEn && hit.name !== hit.nameEn ? hit.name : `NEVO ${hit.nevoCode}`}
              loading={importingKey === `nevo-${hit.nevoCode}`}
              onPress={() => void onImportNevo(hit)}
            />
          ))
        : null}
      {filter === "usda"
        ? usdaHits.map((hit) => (
            <CatalogRow
              key={hit.fdcId}
              title={hit.name}
              caption={hit.dataType}
              loading={importingKey === `usda-${hit.fdcId}`}
              onPress={() => void onImportUsda(hit)}
            />
          ))
        : null}
      <DiaryMealPickerSheet
        visible={mealPickerVisible}
        meals={meals}
        onClose={() => {
          setMealPickerVisible(false);
          setPendingFood(null);
        }}
        onSelectMeal={(nextMealId) => {
          const food = pendingFood;
          setMealPickerVisible(false);
          setPendingFood(null);
          if (!food) return;
          void (async () => {
            setLoggingId(food.id);
            try {
              await logFoodToMeal(food, nextMealId);
              setCheckedIds((current) => new Set(current).add(food.id));
            } catch (err) {
              setError(err instanceof ApiRequestError ? err.message : "Could not log that food.");
            } finally {
              setLoggingId(null);
            }
          })();
        }}
        onCreateMeal={() => {
          setMealPickerVisible(false);
          setCreateMealVisible(true);
        }}
      />
      <DiaryMealNameSheet
        visible={createMealVisible}
        title="New meal group"
        confirmLabel="Add and log"
        onClose={() => {
          setCreateMealVisible(false);
          setPendingFood(null);
        }}
        onConfirm={async (name) => {
          if (!pendingFood || !name.trim()) return;
          setMealSaving(true);
          try {
            const live = await createDiaryMeal(date, name);
            const created = live.meals.find((meal) => meal.name === name.trim()) ?? live.meals[live.meals.length - 1];
            setMeals(live.meals);
            setCreateMealVisible(false);
            if (created) {
              await logFoodToMeal(pendingFood, created.id);
              setCheckedIds((current) => new Set(current).add(pendingFood.id));
            }
            setPendingFood(null);
          } catch (err) {
            setError(err instanceof ApiRequestError ? err.message : "Could not create meal group.");
          } finally {
            setMealSaving(false);
          }
        }}
        loading={mealSaving}
      />
    </Screen>
  );
}

interface FoodRowProps {
  food: UserFood;
  caption: string;
  checked: boolean;
  checking: boolean;
  showCheck: boolean;
  onCheck: () => void;
  onOpen: () => void;
  onDelete: () => void;
}

function FoodRow(props: FoodRowProps) {
  const { food, caption, checked, checking, showCheck, onCheck, onOpen, onDelete } = props;
  const menuRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null);

  return (
    <>
      <View style={styles.row}>
        {showCheck ? (
          <Pressable
            onPress={onCheck}
            disabled={checking}
            style={[styles.check, checked && styles.checkOn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked, busy: checking }}
            accessibilityLabel={`Log ${food.name}`}
          >
            {checked ? <Check size={16} color={tokens.bg} weight="bold" /> : null}
          </Pressable>
        ) : null}
        <Pressable
          style={styles.copy}
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={food.name}
        >
          <AppText variant="title">{food.name}</AppText>
          <AppText variant="caption" color="muted">
            {caption}
          </AppText>
        </Pressable>
        <Pressable
          ref={menuRef}
          onPress={() => {
            measureContextMenuAnchor(menuRef, (next) => {
              setAnchor(next);
              setMenuOpen(true);
            });
          }}
          style={styles.menuButton}
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${food.name}`}
          hitSlop={8}
        >
          <DotsThreeVertical size={22} color={tokens.text} weight="bold" />
        </Pressable>
      </View>
      <ContextMenu
        visible={menuOpen}
        anchor={anchor}
        onClose={() => {
          setMenuOpen(false);
          setAnchor(null);
        }}
        items={[{ label: "Delete", destructive: true, onPress: onDelete }]}
      />
    </>
  );
}

interface CatalogRowProps {
  title: string;
  caption: string;
  loading: boolean;
  onPress: () => void;
}

function CatalogRow(props: CatalogRowProps) {
  const { title, caption, loading, onPress } = props;
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.copy}>
        <AppText variant="title">{title}</AppText>
        <AppText variant="caption" color="muted">
          {loading ? "Importing…" : caption}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  searchField: {
    flex: 1,
    minWidth: 0,
  },
  filterButton: {
    width: 52,
    height: 52,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonOn: {
    borderColor: tokens.accent,
  },
  filterPanel: {
    gap: tokens.space.sm,
  },
  filterGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.xs,
  },
  filterChip: {
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.bgElevated,
  },
  filterChipOn: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
  },
  filterChipLabel: {
    color: tokens.textMuted,
    fontFamily: tokens.font.bodyBold,
  },
  filterChipLabelOn: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  copy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
