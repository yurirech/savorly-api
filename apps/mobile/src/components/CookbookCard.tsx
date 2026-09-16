import { BookOpen } from "phosphor-react-native";
import { Image, Pressable, StyleSheet, View } from "react-native";
import type { CookbookSummary } from "@savorly/shared";
import { imageForCategory } from "../assets/categoryImages";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type CookbookCardProps = {
  cookbook: CookbookSummary;
  onPress: () => void;
};

export function CookbookCard(props: CookbookCardProps) {
  const { cookbook, onPress } = props;
  const tiles = [0, 1, 2, 3].map((index) => cookbook.previewRecipes[index] ?? null);
  const countLabel = cookbook.recipeCount === 1 ? "1 recipe" : `${cookbook.recipeCount} recipes`;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, tokens.shadow.card, pressed && styles.pressed]}>
      <View style={styles.mosaic}>
        {tiles.map((recipe, index) =>
          recipe ? (
            <Image key={`${cookbook.id}-${index}`} source={imageForCategory(recipe.category)} style={styles.tile} />
          ) : (
            <View key={`${cookbook.id}-empty-${index}`} style={styles.emptyTile}>
              {index === 0 && cookbook.recipeCount === 0 ? (
                <BookOpen size={22} color={tokens.textMuted} weight="regular" />
              ) : null}
            </View>
          ),
        )}
      </View>
      <View style={styles.meta}>
        <AppText variant="title" numberOfLines={2}>
          {cookbook.name}
        </AppText>
        <AppText variant="caption" color="muted">
          {countLabel}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 210,
    borderRadius: tokens.radius.lg,
    overflow: "hidden",
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
  },
  mosaic: {
    height: 128,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tile: {
    width: "50%",
    height: 64,
  },
  emptyTile: {
    width: "50%",
    height: 64,
    backgroundColor: tokens.bgElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    flex: 1,
    justifyContent: "flex-end",
    padding: tokens.space.md,
    gap: tokens.space.xs,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});
