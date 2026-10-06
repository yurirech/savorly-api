import { Pressable } from "react-native";
import type { SavedRecipe } from "@savorly/shared";
import { openExternalUrl } from "../utils/openUrl";
import { AppText } from "./AppText";

type RecipeSourceLabelProps = {
  recipe: SavedRecipe;
  numberOfLines?: number;
};

function RecipeSourceLabel(props: RecipeSourceLabelProps) {
  const { recipe, numberOfLines } = props;
  const label = recipe.source.author || recipe.source.sourceName || recipe.source.type;
  const url = recipe.source.originalUrl?.trim();

  if (url) {
    return (
      <Pressable
        onPress={() => void openExternalUrl(url)}
        accessibilityRole="link"
        accessibilityLabel={`Open source, ${label}`}
      >
        <AppText variant="caption" color="accent" numberOfLines={numberOfLines}>
          {label}
        </AppText>
      </Pressable>
    );
  }

  return (
    <AppText variant="caption" color="muted" numberOfLines={numberOfLines}>
      {label}
    </AppText>
  );
}

export default RecipeSourceLabel;
