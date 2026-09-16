import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { RecipeCard } from "./RecipeCard";

type RecipeGridProps = {
  recipes: SavedRecipe[];
};

export function RecipeGrid(props: RecipeGridProps) {
  const { recipes } = props;
  return (
    <View style={styles.grid}>
      {recipes.map((recipe) => (
        <View key={recipe.id} style={styles.cell}>
          <RecipeCard recipe={recipe} onPress={() => router.push(`/(app)/recipe/${recipe.id}`)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  cell: {
    width: "48%",
    minHeight: 210,
  },
});
