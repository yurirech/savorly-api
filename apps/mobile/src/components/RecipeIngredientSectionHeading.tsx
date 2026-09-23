import { StyleSheet } from "react-native";
import { ingredientSectionTitle, type Ingredient } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type RecipeIngredientSectionHeadingProps = {
  ingredient: Ingredient;
};

export function RecipeIngredientSectionHeading(props: RecipeIngredientSectionHeadingProps) {
  const { ingredient } = props;
  const title = ingredientSectionTitle(ingredient);
  return (
    <AppText variant="label" color="accent" style={styles.heading}>
      {title}
    </AppText>
  );
}

const styles = StyleSheet.create({
  heading: {
    paddingTop: tokens.space.sm,
  },
});
