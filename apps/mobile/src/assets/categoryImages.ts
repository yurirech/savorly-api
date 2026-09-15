import type { ImageSourcePropType } from "react-native";
import type { FoodCategory } from "@savorly/shared";

export const categoryImages: Record<FoodCategory, ImageSourcePropType> = {
  cake: require("../../assets/categories/cake.webp"),
  muffin: require("../../assets/categories/muffin.webp"),
  bread: require("../../assets/categories/bread.webp"),
  cookie: require("../../assets/categories/cookie.webp"),
  dessert: require("../../assets/categories/dessert.webp"),
  pasta: require("../../assets/categories/pasta.webp"),
  rice: require("../../assets/categories/rice.webp"),
  soup: require("../../assets/categories/soup.webp"),
  salad: require("../../assets/categories/salad.webp"),
  breakfast: require("../../assets/categories/breakfast.webp"),
  meat: require("../../assets/categories/meat.webp"),
  fish: require("../../assets/categories/fish.webp"),
  vegetarian: require("../../assets/categories/vegetarian.webp"),
  drink: require("../../assets/categories/drink.webp"),
  snack: require("../../assets/categories/snack.webp"),
  other: require("../../assets/categories/other.webp"),
};

export function imageForCategory(category: FoodCategory): ImageSourcePropType {
  return categoryImages[category] ?? categoryImages.other;
}
