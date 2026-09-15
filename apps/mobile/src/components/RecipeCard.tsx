import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { imageForCategory } from "../assets/categoryImages";
import { tokens } from "../theme/tokens";

type RecipeCardProps = {
  recipe: SavedRecipe;
  onPress: () => void;
};

export function RecipeCard(props: RecipeCardProps) {
  const { recipe, onPress } = props;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={imageForCategory(recipe.category)} style={styles.image} />
      <View style={styles.meta}>
        <Text style={styles.category}>{recipe.category}</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <Text style={styles.source} numberOfLines={1}>
          {recipe.source.author || recipe.source.sourceName || recipe.source.type}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: tokens.border,
  },
  pressed: {
    opacity: 0.9,
  },
  image: {
    width: "100%",
    height: 140,
  },
  meta: {
    padding: tokens.space.md,
    gap: 4,
  },
  category: {
    color: tokens.accent,
    fontSize: tokens.type.caption,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title,
    fontWeight: "600",
  },
  source: {
    color: tokens.muted,
    fontSize: tokens.type.caption,
  },
});
