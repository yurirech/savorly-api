import { Image, Pressable, StyleSheet, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { imageForCategory } from "../assets/categoryImages";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type RecipeCardProps = {
  recipe: SavedRecipe;
  onPress: () => void;
  layout?: "grid" | "row";
};

export function RecipeCard(props: RecipeCardProps) {
  const { recipe, onPress, layout = "grid" } = props;
  const source = recipe.source.author || recipe.source.sourceName || recipe.source.type;
  if (layout === "row") {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}>
        <Image source={imageForCategory(recipe.category)} style={styles.rowImage} />
        <View style={styles.rowMeta}>
          <AppText variant="label" color="accent">
            {recipe.category}
          </AppText>
          <AppText variant="title" numberOfLines={2}>
            {recipe.title}
          </AppText>
          <AppText variant="caption" color="muted" numberOfLines={1}>
            {source}
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.gridCard, tokens.shadow.card, pressed && styles.pressed]}>
      <Image source={imageForCategory(recipe.category)} style={styles.gridImage} />
      <View style={styles.scrim} pointerEvents="none" />
      <View style={styles.gridMeta}>
        <AppText variant="label" color="accent">
          {recipe.category}
        </AppText>
        <AppText variant="title" numberOfLines={2}>
          {recipe.title}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {source}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gridCard: {
    flex: 1,
    minHeight: 200,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    backgroundColor: tokens.surface,
  },
  gridImage: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: "100%",
    height: "100%",
  },
  scrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: tokens.bg,
    opacity: 0.45,
  },
  gridMeta: {
    flex: 1,
    justifyContent: "flex-end",
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  rowCard: {
    flexDirection: "row",
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.border,
  },
  rowImage: {
    width: 96,
    height: 96,
  },
  rowMeta: {
    flex: 1,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    justifyContent: "center",
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
