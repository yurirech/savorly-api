import { StyleSheet, View } from "react-native";
import type { Ingredient } from "@savorly/shared";
import { formatIngredientLine, isMixInIngredient } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { softWrapText } from "../utils/textWrap";
import { AppText } from "./AppText";

type RecipeIngredientLineProps = {
  ingredient: Ingredient;
  line?: string;
};

export function RecipeIngredientLine(props: RecipeIngredientLineProps) {
  const { ingredient, line } = props;
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.line}>
        {softWrapText(line ?? formatIngredientLine(ingredient))}
      </AppText>
      {isMixInIngredient(ingredient) ? (
        <AppText variant="caption" color="accent">
          Mix-in
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: tokens.space.xs,
  },
  line: {
    flexShrink: 1,
  },
});
