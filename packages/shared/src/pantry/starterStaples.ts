export type StarterPantryStaple = {
  key: string;
  defaultName: string;
  defaultAliases: string[];
  canonicalKey?: string;
};

export const STARTER_PANTRY_STAPLES: StarterPantryStaple[] = [
  {
    key: "beans",
    defaultName: "Beans",
    defaultAliases: ["beans", "black beans", "kidney beans", "feijão", "feijao", "fagioli", "fagiolini"],
  },
  {
    key: "chickpeas",
    defaultName: "Chickpeas",
    defaultAliases: ["chickpeas", "garbanzo beans", "grão de bico", "grao de bico", "ceci"],
  },
  {
    key: "rice",
    defaultName: "Rice",
    defaultAliases: ["rice", "white rice", "arroz", "riso"],
  },
  {
    key: "pasta",
    defaultName: "Pasta",
    defaultAliases: ["pasta", "spaghetti", "penne", "macaroni", "massa", "pasta secca"],
  },
  {
    key: "canned_tomatoes",
    defaultName: "Canned tomatoes",
    defaultAliases: ["canned tomatoes", "tomato passata", "polpa", "pelati", "tomate triturado"],
  },
  {
    key: "onions",
    defaultName: "Onions",
    defaultAliases: ["onions", "onion", "cebola", "cipolla"],
  },
  {
    key: "garlic",
    defaultName: "Garlic",
    defaultAliases: ["garlic", "alho", "aglio"],
  },
  {
    key: "potatoes",
    defaultName: "Potatoes",
    defaultAliases: ["potatoes", "potato", "batata", "patate"],
  },
  {
    key: "eggs",
    defaultName: "Eggs",
    defaultAliases: ["eggs", "egg", "ovos", "uova"],
  },
  {
    key: "milk",
    defaultName: "Milk",
    defaultAliases: ["milk", "whole milk", "leite", "latte"],
  },
  {
    key: "olive_oil",
    defaultName: "Olive oil",
    defaultAliases: ["olive oil", "extra virgin olive oil", "azeite", "olio di oliva", "olio evo"],
    canonicalKey: "olive_oil",
  },
  {
    key: "flour",
    defaultName: "Flour",
    defaultAliases: ["flour", "all purpose flour", "plain flour", "farinha", "farina"],
    canonicalKey: "all_purpose_flour",
  },
  {
    key: "sugar",
    defaultName: "Sugar",
    defaultAliases: ["sugar", "white sugar", "granulated sugar", "açúcar", "acucar", "zucchero"],
    canonicalKey: "granulated_sugar",
  },
  {
    key: "salt",
    defaultName: "Salt",
    defaultAliases: ["salt", "table salt", "sal", "sale"],
  },
  {
    key: "black_pepper",
    defaultName: "Black pepper",
    defaultAliases: ["black pepper", "pepper", "pimenta preta", "pepe nero"],
  },
  {
    key: "butter",
    defaultName: "Butter",
    defaultAliases: ["butter", "manteiga", "burro"],
    canonicalKey: "unsalted_butter",
  },
  {
    key: "cheese",
    defaultName: "Cheese",
    defaultAliases: ["cheese", "cheddar", "parmesan", "queijo", "formaggio"],
  },
  {
    key: "chicken",
    defaultName: "Chicken",
    defaultAliases: ["chicken", "chicken breast", "frango", "pollo"],
  },
  {
    key: "ground_beef",
    defaultName: "Ground beef",
    defaultAliases: ["ground beef", "minced beef", "carne moída", "carne moida", "carne macinata"],
  },
  {
    key: "frozen_vegetables",
    defaultName: "Frozen vegetables",
    defaultAliases: ["frozen vegetables", "frozen peas", "frozen spinach", "legumes congelados", "verdure surgelate"],
  },
];

const starterByKeyMap = new Map(STARTER_PANTRY_STAPLES.map((item) => [item.key, item]));

export function starterPantryStapleByKey(key: string): StarterPantryStaple | undefined {
  return starterByKeyMap.get(key);
}

export function isStarterPantryKey(key: string): boolean {
  return starterByKeyMap.has(key);
}
