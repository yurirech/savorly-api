import { type Href, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Check, DotsThreeVertical, FunnelSimple } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  foodMatchesQuery,
  scaleNutrition,
  type FatsecretFoodHit,
  type NevoFoodHit,
  type UsdaFoodHit,
  type UserFood,
} from "@savorly/shared";
import {
  addDiaryEntry,
  ApiRequestError,
  createDiaryMeal,
  deleteNutritionFood,
  fetchDiaryDay,
  fetchFrequentGrams,
  importFatsecretFood,
  importNevoFood,
  importUsdaFood,
  listNutritionFoods,
  searchFatsecretFoods,
  searchNevoFoods,
  searchUsdaFoods,
  updateNutritionRecipeItem,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import Skeleton from "../../../src/components/Skeleton";
import ContextMenu, {
  measureContextMenuAnchor,
  type ContextMenuAnchor,
} from "../../../src/components/ContextMenu";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { setCachedFood } from "../../../src/diary/foodDetailCache";
import { takeLastLoggedFood } from "../../../src/diary/lastLoggedFood";
import DiaryMealNameSheet from "../../../src/diary/DiaryMealNameSheet";
import DiaryMealPickerSheet from "../../../src/diary/DiaryMealPickerSheet";
import { pickMealFromDay, resolveMealForDate, writeLastDiaryMeal } from "../../../src/diary/lastDiaryMealStorage";
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
  if (source === "fatsecret") return "FatSecret";
  if (source === "recipe") return "Recipe";
  return "Manual";
}

type CatalogFilter = "library" | "nevo" | "usda" | "fatsecret";
type LibraryTab = string;

const RESERVED_LIBRARY_TABS = new Set(["all", "mine", "recipes"]);

const CATALOG_FILTERS: { value: CatalogFilter; label: string }[] = [
  { value: "library", label: "Library" },
  { value: "nevo", label: "NEVO" },
  { value: "usda", label: "USDA" },
  { value: "fatsecret", label: "FatSecret" },
];

const LIBRARY_TABS: { value: LibraryTab; label: string }[] = [
  { value: "all", label: "All foods" },
  { value: "mine", label: "My foods" },
  { value: "recipes", label: "My recipes" },
];

function uniqueFoodCategories(foods: UserFood[]): string[] {
  const names = new Set<string>();
  for (const food of foods) {
    const name = food.category?.trim();
    if (!name || RESERVED_LIBRARY_TABS.has(name)) continue;
    names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function foodMatchesLibraryTab(food: UserFood, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "mine") return food.source !== "recipe";
  if (tab === "recipes") return food.source === "recipe";
  return food.category === tab;
}

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
  const [loggedGrams, setLoggedGrams] = useState<Record<string, number>>({});
  const [libraryReady, setLibraryReady] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const [meals, setMeals] = useState<DiaryMealGroup[]>([]);
  const [boundMeal, setBoundMeal] = useState<{ id: string; name: string } | null>(null);
  const [pendingFood, setPendingFood] = useState<UserFood | null>(null);
  const [mealPickerVisible, setMealPickerVisible] = useState(false);
  const [createMealVisible, setCreateMealVisible] = useState(false);
  const [mealSaving, setMealSaving] = useState(false);
  const [nevoHits, setNevoHits] = useState<NevoFoodHit[]>([]);
  const [usdaHits, setUsdaHits] = useState<UsdaFoodHit[]>([]);
  const [fatsecretHits, setFatsecretHits] = useState<FatsecretFoodHit[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const boundMealRef = useRef(boundMeal);
  boundMealRef.current = boundMeal;

  const loadLibrary = useCallback(async () => {
    const { listFoodsLocal } = await import("../../../src/offline/store");
    const cached = await listFoodsLocal();
    setFoods(cached);
    setLibraryReady(true);
    void listNutritionFoods()
      .then((live) => {
        setFoods(live.foods);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cached.length > 0) return;
        setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
      });
  }, []);

  const loadMealContext = useCallback(async () => {
    const { openLocalDiaryDay } = await import("../../../src/offline/sync");
    async function bindMeal(mealsForDay: DiaryMealGroup[]) {
      const picked =
        pickMealFromDay(mealsForDay, mealIdParam, boundMealRef.current?.name) ??
        (await resolveMealForDate(date));
      const next = picked ?? (mealIdParam ? boundMealRef.current ?? { id: mealIdParam, name: "Meal" } : null);
      if (!next) return;
      boundMealRef.current = next;
      setBoundMeal(next);
      if (picked) {
        await writeLastDiaryMeal({ mealId: picked.id, mealName: picked.name, date });
      }
    }
    try {
      const local = await openLocalDiaryDay(date);
      setMeals(local.meals);
      await bindMeal(local.meals);
    } catch {
      if (mealIdParam) {
        const next = boundMealRef.current ?? { id: mealIdParam, name: "Meal" };
        boundMealRef.current = next;
        setBoundMeal(next);
      }
    }
    void fetchDiaryDay(date)
      .then(async (day) => {
        setMeals(day.meals);
        await bindMeal(day.meals);
      })
      .catch(() => undefined);
  }, [date, mealIdParam]);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
      void loadMealContext();
      const logged = takeLastLoggedFood();
      if (logged) {
        setCheckedIds((current) => new Set(current).add(logged.foodId));
        setLoggedGrams((current) => ({ ...current, [logged.foodId]: logged.grams }));
      }
    }, [loadLibrary, loadMealContext]),
  );

  useEffect(() => {
    const term = query.trim();
    if (!term || filter !== "library") return;
    const handle = setTimeout(() => {
      void import("../../../src/offline/store").then(({ listFoodsLocal }) =>
        listFoodsLocal(term).then((local) => {
          setFoods((current) => mergeFoods(current, local));
        }),
      );
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
      setFatsecretHits([]);
      return;
    }
    const handle = setTimeout(() => {
      setCatalogLoading(true);
      setError(null);
      setNevoHits([]);
      setUsdaHits([]);
      setFatsecretHits([]);
      const search =
        filter === "nevo"
          ? searchNevoFoods(term)
          : filter === "fatsecret"
            ? searchFatsecretFoods(term)
            : searchUsdaFoods(term);
      void search
        .then((live) => {
          if (filter === "nevo") {
            setNevoHits(live.foods as NevoFoodHit[]);
            setUsdaHits([]);
            setFatsecretHits([]);
            if (live.foods.length === 0) setError('Geen match. Probeer “halfvolle melk” of “havermout”.');
          } else if (filter === "fatsecret") {
            setFatsecretHits(live.foods as FatsecretFoodHit[]);
            setNevoHits([]);
            setUsdaHits([]);
            if (live.foods.length === 0) setError("No FatSecret match. Try “banana” or “cheddar cheese”.");
          } else {
            setUsdaHits(live.foods as UsdaFoodHit[]);
            setNevoHits([]);
            setFatsecretHits([]);
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
  const categoryTabs = useMemo(() => uniqueFoodCategories(foods), [foods]);
  const libraryTabs = useMemo(
    () => [...LIBRARY_TABS, ...categoryTabs.map((name) => ({ value: name, label: name }))],
    [categoryTabs],
  );
  const visible = searched.filter((food) => foodMatchesLibraryTab(food, tab));

  useEffect(() => {
    if (RESERVED_LIBRARY_TABS.has(tab)) return;
    if (!categoryTabs.includes(tab)) setTab("all");
  }, [categoryTabs, tab]);

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
    setLoggedGrams((current) => ({ ...current, [food.id]: grams }));
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
      setLoggedGrams((current) => {
        const next = { ...current };
        delete next[food.id];
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

  async function onImportFatsecret(hit: FatsecretFoodHit) {
    const existing = foods.find((food) => food.source === "fatsecret" && food.fatsecretId === hit.foodId);
    if (existing) {
      openFood(existing);
      return;
    }
    setImportingKey(`fatsecret-${hit.foodId}`);
    setError(null);
    try {
      const saved = await importFatsecretFood(hit.foodId, hit.name);
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

  function foodCaption(food: UserFood): string {
    const grams = loggedGrams[food.id];
    if (grams != null) {
      return `${grams} g · ${scaleNutrition(food.per100g, grams).kcal} kcal · ${sourceCaption(food.source)}`;
    }
    return `${food.per100g.kcal} kcal / 100 g · ${sourceCaption(food.source)}`;
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
                  filter === "nevo"
                    ? "Search NEVO"
                    : filter === "usda"
                      ? "Search USDA"
                      : filter === "fatsecret"
                        ? "Search FatSecret"
                        : "Search my foods"
                }
                value={query}
                onChangeText={setQuery}
                variant="search"
              />
            </View>
            <Pressable
              onPress={() => setFiltersOpen((open) => !open)}
              style={[styles.filterButton, (filtersOpen || filter !== "library") && styles.filterButtonOn]}
              accessibilityRole="button"
              accessibilityState={{ expanded: filtersOpen }}
              accessibilityLabel="Filters"
            >
              <FunnelSimple
                size={20}
                color={filter !== "library" ? tokens.accent : tokens.text}
                weight={filter !== "library" ? "fill" : "regular"}
              />
            </Pressable>
          </View>
          {filter === "library" ? (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.libraryTabsContent}
            >
              <View style={styles.libraryTabsTrack}>
                {libraryTabs.map((option) => {
                  const selected = tab === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setTab(option.value)}
                      style={[styles.libraryTab, selected && styles.libraryTabOn]}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      accessibilityLabel={option.label}
                    >
                      <AppText
                        variant="caption"
                        style={selected ? styles.libraryTabLabelOn : styles.libraryTabLabel}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          ) : null}
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
            </View>
          ) : null}
        </>
      }
      overlay={
        mealIdParam ? (
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.fab,
              { bottom: tokens.space.lg + insets.bottom },
              pressed && styles.fabPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="LOG"
          >
            <AppText variant="body" style={styles.fabLabel}>
              LOG
            </AppText>
          </Pressable>
        ) : null
      }
    >
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {filter === "library" && !libraryReady ? <FoodsListSkeleton /> : null}
      {filter === "library" && libraryReady && visible.length === 0 ? (
        <AppText variant="body" color="muted">
          Nothing saved yet. Import skim milk or add peanut butter by hand.
        </AppText>
      ) : null}
      {filter === "library" && libraryReady
        ? visible.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              caption={foodCaption(food)}
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
      {filter === "fatsecret" && !query.trim() ? (
        <AppText variant="body" color="muted">
          Search US branded and generic foods, then log from the profile.
        </AppText>
      ) : null}
      {catalogLoading ? <FoodsListSkeleton rows={4} /> : null}
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
      {filter === "fatsecret"
        ? fatsecretHits.map((hit) => (
            <CatalogRow
              key={hit.foodId}
              title={hit.name}
              caption={hit.brandName ? `${hit.brandName} · ${hit.foodType}` : hit.foodType}
              loading={importingKey === `fatsecret-${hit.foodId}`}
              onPress={() => void onImportFatsecret(hit)}
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
      {mealIdParam ? <View style={styles.fabClearance} /> : null}
    </Screen>
  );
}

function FoodsListSkeleton(props: { rows?: number }) {
  const { rows = 6 } = props;
  return (
    <View style={styles.skeleton}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.skeletonRow}>
          <Skeleton width={22} height={22} radius={tokens.radius.sm} />
          <View style={styles.skeletonCopy}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
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
  libraryTabsContent: {
    flexGrow: 1,
  },
  libraryTabsTrack: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: "100%",
    backgroundColor: tokens.bgElevated,
    borderRadius: tokens.radius.full,
    padding: tokens.space.xs,
    gap: tokens.space.xs,
  },
  libraryTab: {
    minHeight: 40,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  libraryTabOn: {
    backgroundColor: tokens.accent,
  },
  libraryTabLabel: {
    color: tokens.textMuted,
    fontFamily: tokens.font.bodyBold,
  },
  libraryTabLabelOn: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
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
  skeleton: {
    gap: tokens.space.sm,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.md,
    paddingVertical: tokens.space.sm,
  },
  skeletonCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  fab: {
    position: "absolute",
    right: tokens.space.lg,
    minHeight: 56,
    paddingHorizontal: tokens.space.lg,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.accent,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
    ...tokens.shadow.card,
  },
  fabPressed: {
    transform: [{ scale: 0.98 }],
  },
  fabLabel: {
    color: tokens.bg,
    fontFamily: tokens.font.bodyBold,
  },
  fabClearance: {
    height: 72,
  },
});
