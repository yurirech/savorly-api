import { type Href, router, useFocusEffect } from "expo-router";
import { DotsThreeVertical } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { foodMatchesQuery, type UserFood } from "@savorly/shared";
import {
  ApiRequestError,
  deleteNutritionFood,
  importStapleFoods,
  listNutritionFoods,
  replaceStapleFoods,
  stapleFoodsStatus,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import ContextMenu, {
  measureContextMenuAnchor,
  type ContextMenuAnchor,
} from "../../../src/components/ContextMenu";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { setCachedFood } from "../../../src/diary/foodDetailCache";
import { tokens } from "../../../src/theme/tokens";
import { confirmDestructive } from "../../../src/utils/confirmDestructive";

function stapleReplaceResult(renamed: number, added: number): string {
  const parts: string[] = [];
  if (renamed > 0) parts.push(`Renamed ${renamed} food${renamed === 1 ? "" : "s"}`);
  if (added > 0) parts.push(`Added ${added} staple${added === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(". ") : "Staples already use English names.";
}

function mergeFoods(current: UserFood[], incoming: UserFood[]): UserFood[] {
  const byId = new Map(current.map((food) => [food.id, food]));
  for (const food of incoming) {
    byId.set(food.id, food);
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export default function DiaryFoodsScreen() {
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<UserFood[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [staplesImported, setStaplesImported] = useState(false);
  const [importingStaples, setImportingStaples] = useState(false);
  const [replacingStaples, setReplacingStaples] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [tab, setTab] = useState<"all" | "recipes">("all");

  const loadLibrary = useCallback(async () => {
    try {
      const [live, staples] = await Promise.all([listNutritionFoods(), stapleFoodsStatus()]);
      setFoods(live.foods);
      setStaplesImported(staples.imported);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not load foods.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadLibrary();
    }, [loadLibrary]),
  );

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    const handle = setTimeout(() => {
      void listNutritionFoods(term)
        .then((live) => {
          setFoods((current) => mergeFoods(current, live.foods));
        })
        .catch(() => undefined);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  const searched = foods.filter((food) => foodMatchesQuery(food, query));
  const visible = tab === "recipes" ? searched.filter((food) => food.source === "recipe") : searched;

  function sourceCaption(source: UserFood["source"]): string {
    if (source === "nevo") return "NEVO";
    if (source === "usda") return "USDA";
    if (source === "recipe") return "Recipe";
    return "Manual";
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

  return (
    <Screen>
      <AppText variant="display">My foods</AppText>
      <AppText variant="body" color="muted">
        A short list of what you actually eat. Search NEVO for Dutch generics, USDA for US staples, or type a label yourself.
      </AppText>
      <Field label="Search my foods" value={query} onChangeText={setQuery} variant="search" />
      <SegmentedControl
        value={tab}
        onChange={setTab}
        options={[
          { value: "all", label: "All foods" },
          { value: "recipes", label: "My recipes" },
        ]}
      />
      <View style={styles.actions}>
      {!staplesImported ? (
      <Button size="compact"
        label="Add my staples"
        loading={importingStaples}
        onPress={() => {
          setImportingStaples(true);
          setError(null);
          setResult(null);
          void importStapleFoods()
            .then(() => loadLibrary())
            .catch((err: unknown) => {
              setError(err instanceof ApiRequestError ? err.message : "Could not add staples.");
            })
            .finally(() => setImportingStaples(false));
        }}
      />
      ) : null}
      <Button
        size="compact"
        label="Replace staples"
        variant="secondary"
        loading={replacingStaples}
        onPress={() => {
          setReplacingStaples(true);
          setError(null);
          setResult(null);
          void replaceStapleFoods()
            .then((live) => {
              setResult(stapleReplaceResult(live.renamed, live.added));
              return loadLibrary();
            })
            .catch((err: unknown) => {
              setError(err instanceof ApiRequestError ? err.message : "Could not replace staples.");
            })
            .finally(() => setReplacingStaples(false));
        }}
      />
      <Button size="compact" label="Search NEVO" variant="secondary" onPress={() => router.push("/(app)/diary/nevo-search" as Href)} />
      <Button size="compact" label="Search USDA" variant="secondary" onPress={() => router.push("/(app)/diary/usda-search" as Href)} />
      <Button size="compact" label="Add manually" variant="secondary" onPress={() => router.push("/(app)/diary/food-form" as Href)} />
      </View>
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
      {result ? <AppText variant="body">{result}</AppText> : null}
      {visible.length === 0 ? (
        <AppText variant="body" color="muted">
          Nothing saved yet. Import skim milk or add peanut butter by hand.
        </AppText>
      ) : null}
      {visible.map((food) => (
        <FoodRow
          key={food.id}
          food={food}
          caption={`${food.per100g.kcal} kcal / 100 g · ${sourceCaption(food.source)}`}
          onOpen={() => {
            setCachedFood(food);
            if (food.source === "recipe" && food.nutritionRecipeId) {
              router.push(`/(app)/diary/nutrition-recipe/${food.nutritionRecipeId}` as Href);
              return;
            }
            router.push(`/(app)/diary/food/${food.id}` as Href);
          }}
          onDelete={() => onDeleteFood(food)}
        />
      ))}
    </Screen>
  );
}

interface FoodRowProps {
  food: UserFood;
  caption: string;
  onOpen: () => void;
  onDelete: () => void;
}

function FoodRow(props: FoodRowProps) {
  const { food, caption, onOpen, onDelete } = props;
  const menuRef = useRef<View>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<ContextMenuAnchor | null>(null);

  return (
    <>
      <View style={styles.row}>
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

const styles = StyleSheet.create({
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
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
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
