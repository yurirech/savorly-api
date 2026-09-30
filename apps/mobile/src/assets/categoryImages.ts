import type { ImageSourcePropType } from "react-native";
import type { FoodCategory } from "@savorly/shared";

const categoryImageSets: Record<FoodCategory, ImageSourcePropType[]> = {
  cake: [
    require("../../assets/categories/cake.webp"),
    require("../../assets/categories/cake-2.webp"),
    require("../../assets/categories/cake-3.webp"),
    require("../../assets/categories/cake-4.webp"),
  ],
  muffin: [
    require("../../assets/categories/muffin.webp"),
    require("../../assets/categories/muffin-2.webp"),
    require("../../assets/categories/muffin-3.webp"),
    require("../../assets/categories/muffin-4.webp"),
  ],
  bread: [
    require("../../assets/categories/bread.webp"),
    require("../../assets/categories/bread-2.webp"),
    require("../../assets/categories/bread-3.webp"),
    require("../../assets/categories/bread-4.webp"),
  ],
  cookie: [
    require("../../assets/categories/cookie.webp"),
    require("../../assets/categories/cookie-2.webp"),
    require("../../assets/categories/cookie-3.webp"),
    require("../../assets/categories/cookie-4.webp"),
  ],
  dessert: [
    require("../../assets/categories/dessert.webp"),
    require("../../assets/categories/dessert-2.webp"),
    require("../../assets/categories/dessert-3.webp"),
    require("../../assets/categories/dessert-4.webp"),
  ],
  pasta: [
    require("../../assets/categories/pasta.webp"),
    require("../../assets/categories/pasta-2.webp"),
    require("../../assets/categories/pasta-3.webp"),
    require("../../assets/categories/pasta-4.webp"),
  ],
  rice: [
    require("../../assets/categories/rice.webp"),
    require("../../assets/categories/rice-2.webp"),
    require("../../assets/categories/rice-3.webp"),
    require("../../assets/categories/rice-4.webp"),
  ],
  soup: [
    require("../../assets/categories/soup.webp"),
    require("../../assets/categories/soup-2.webp"),
    require("../../assets/categories/soup-3.webp"),
    require("../../assets/categories/soup-4.webp"),
  ],
  salad: [
    require("../../assets/categories/salad.webp"),
    require("../../assets/categories/salad-2.webp"),
    require("../../assets/categories/salad-3.webp"),
    require("../../assets/categories/salad-4.webp"),
  ],
  breakfast: [
    require("../../assets/categories/breakfast.webp"),
    require("../../assets/categories/breakfast-2.webp"),
    require("../../assets/categories/breakfast-3.webp"),
    require("../../assets/categories/breakfast-4.webp"),
  ],
  meat: [
    require("../../assets/categories/meat.webp"),
    require("../../assets/categories/meat-2.webp"),
    require("../../assets/categories/meat-3.webp"),
    require("../../assets/categories/meat-4.webp"),
  ],
  fish: [
    require("../../assets/categories/fish.webp"),
    require("../../assets/categories/fish-2.webp"),
    require("../../assets/categories/fish-3.webp"),
    require("../../assets/categories/fish-4.webp"),
  ],
  vegetarian: [
    require("../../assets/categories/vegetarian.webp"),
    require("../../assets/categories/vegetarian-2.webp"),
    require("../../assets/categories/vegetarian-3.webp"),
    require("../../assets/categories/vegetarian-4.webp"),
  ],
  drink: [
    require("../../assets/categories/drink.webp"),
    require("../../assets/categories/drink-2.webp"),
    require("../../assets/categories/drink-3.webp"),
    require("../../assets/categories/drink-4.webp"),
  ],
  snack: [
    require("../../assets/categories/snack.webp"),
    require("../../assets/categories/snack-2.webp"),
    require("../../assets/categories/snack-3.webp"),
    require("../../assets/categories/snack-4.webp"),
  ],
  other: [
    require("../../assets/categories/other.webp"),
    require("../../assets/categories/other-2.webp"),
    require("../../assets/categories/other-3.webp"),
    require("../../assets/categories/other-4.webp"),
  ],
};

export const categoryImages: Record<FoodCategory, ImageSourcePropType> = {
  cake: categoryImageSets.cake[0]!,
  muffin: categoryImageSets.muffin[0]!,
  bread: categoryImageSets.bread[0]!,
  cookie: categoryImageSets.cookie[0]!,
  dessert: categoryImageSets.dessert[0]!,
  pasta: categoryImageSets.pasta[0]!,
  rice: categoryImageSets.rice[0]!,
  soup: categoryImageSets.soup[0]!,
  salad: categoryImageSets.salad[0]!,
  breakfast: categoryImageSets.breakfast[0]!,
  meat: categoryImageSets.meat[0]!,
  fish: categoryImageSets.fish[0]!,
  vegetarian: categoryImageSets.vegetarian[0]!,
  drink: categoryImageSets.drink[0]!,
  snack: categoryImageSets.snack[0]!,
  other: categoryImageSets.other[0]!,
};

function variantIndex(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash % 4;
}

export function imageForCategory(category: FoodCategory, recipeId?: string): ImageSourcePropType {
  const images = categoryImageSets[category] ?? categoryImageSets.other;
  const index = recipeId ? variantIndex(recipeId) : 0;
  return images[index] ?? images[0]!;
}
