import { foldAlias } from "../ingredients/units";

export type FoodKind =
  | "recipe"
  | "mushroom"
  | "legume"
  | "nut"
  | "cheese"
  | "butter"
  | "dairy"
  | "egg"
  | "fish"
  | "poultry"
  | "meat"
  | "bread"
  | "pasta"
  | "rice"
  | "grain"
  | "potato"
  | "oil"
  | "juice"
  | "hot_drink"
  | "alcohol"
  | "sweet"
  | "sugar"
  | "banana"
  | "berry"
  | "fruit"
  | "carrot"
  | "tomato"
  | "onion"
  | "garlic"
  | "broccoli"
  | "vegetable"
  | "spice"
  | "other";

export type FoodVisual = { kind: FoodKind; emoji: string };

type FoodVisualInput = {
  name: string;
  originalName?: string | null;
  source?: string | null;
};

const RULES: Array<{ kind: FoodKind; emoji: string; keywords: string[] }> = [
  { kind: "mushroom", emoji: "🍄", keywords: ["mushroom", "mushrooms", "champignon", "champignons", "paddenstoel"] },
  { kind: "nut", emoji: "🥜", keywords: ["pindakaas", "peanut", "pinda", "pindas", "nut", "nuts", "noten", "almond", "amandel", "amandelen", "cashew", "walnut", "walnoot", "hazelnut", "hazelnoot", "seeds", "zaad", "zaden", "pistache"] },
  { kind: "legume", emoji: "🫘", keywords: ["lentils", "linzen", "chickpeas", "kikkererwten", "beans", "bonen", "tofu", "tempeh", "hummus"] },
  { kind: "cheese", emoji: "🧀", keywords: ["cheese", "kaas", "mozzarella", "parmesan", "parmezaan", "feta", "cheddar", "gouda", "ricotta", "mascarpone", "brie"] },
  { kind: "butter", emoji: "🧈", keywords: ["butter", "boter", "margarine"] },
  { kind: "dairy", emoji: "🥛", keywords: ["milk", "melk", "yoghurt", "yogurt", "kwark", "quark", "skyr", "cream", "room", "vla", "kefir", "custard"] },
  { kind: "egg", emoji: "🥚", keywords: ["egg", "eggs", "ei", "eieren", "eiwit", "eigeel"] },
  { kind: "fish", emoji: "🐟", keywords: ["fish", "vis", "salmon", "zalm", "tuna", "tonijn", "cod", "kabeljauw", "shrimp", "garnalen", "haring", "makreel", "mackerel", "sardine", "sardines"] },
  { kind: "poultry", emoji: "🍗", keywords: ["chicken", "kip", "kipfilet", "turkey", "kalkoen"] },
  { kind: "meat", emoji: "🥩", keywords: ["meat", "vlees", "beef", "rund", "pork", "varken", "ham", "bacon", "spek", "gehakt", "mince", "steak", "lamb", "worst", "sausage", "salami"] },
  { kind: "bread", emoji: "🍞", keywords: ["bread", "brood", "toast", "bagel", "wrap", "tortilla", "croissant", "beschuit", "cracker", "crackers", "pita"] },
  { kind: "pasta", emoji: "🍝", keywords: ["pasta", "spaghetti", "macaroni", "penne", "fusilli", "lasagne", "noodles", "noedels"] },
  { kind: "rice", emoji: "🍚", keywords: ["rice", "rijst", "couscous", "quinoa"] },
  { kind: "grain", emoji: "🌾", keywords: ["oat", "oats", "oatmeal", "haver", "havermout", "flour", "bloem", "meel", "muesli", "granola", "cereal", "ontbijtgranen"] },
  { kind: "potato", emoji: "🥔", keywords: ["potato", "potatoes", "aardappel", "aardappelen", "fries", "friet"] },
  { kind: "oil", emoji: "🫒", keywords: ["oil", "olie", "olive", "olijf", "olijven"] },
  { kind: "juice", emoji: "🧃", keywords: ["juice", "sap"] },
  { kind: "hot_drink", emoji: "☕", keywords: ["coffee", "koffie", "espresso", "tea", "thee"] },
  { kind: "alcohol", emoji: "🍷", keywords: ["wine", "wijn", "beer", "bier"] },
  { kind: "sweet", emoji: "🍫", keywords: ["chocolate", "chocola", "chocolade", "cacao", "cocoa", "candy", "snoep", "cookie", "cookies", "koek", "koekje", "biscuit", "cake", "taart", "ijs"] },
  { kind: "sugar", emoji: "🍯", keywords: ["honey", "honing", "sugar", "suiker", "syrup", "stroop", "jam"] },
  { kind: "banana", emoji: "🍌", keywords: ["banana", "banaan", "bananen"] },
  { kind: "berry", emoji: "🍓", keywords: ["strawberry", "strawberries", "aardbei", "aardbeien", "blueberry", "blueberries", "raspberry", "framboos", "frambozen", "berries", "bessen"] },
  { kind: "fruit", emoji: "🍎", keywords: ["fruit", "apple", "appel", "appels", "pear", "peer", "orange", "sinaasappel", "mango", "grape", "grapes", "druif", "druiven", "kiwi", "lemon", "citroen", "lime", "peach", "perzik", "pineapple", "ananas", "melon", "meloen"] },
  { kind: "carrot", emoji: "🥕", keywords: ["carrot", "carrots", "wortel", "wortels", "wortelen"] },
  { kind: "tomato", emoji: "🍅", keywords: ["tomato", "tomatoes", "tomaat", "tomaten"] },
  { kind: "garlic", emoji: "🧄", keywords: ["garlic", "knoflook"] },
  { kind: "onion", emoji: "🧅", keywords: ["onion", "onions", "ui", "uien", "sjalot", "shallot"] },
  { kind: "broccoli", emoji: "🥦", keywords: ["broccoli", "bloemkool", "cauliflower"] },
  { kind: "vegetable", emoji: "🥬", keywords: ["vegetable", "vegetables", "groente", "groenten", "spinach", "spinazie", "lettuce", "sla", "kale", "boerenkool", "cabbage", "kool", "cucumber", "komkommer", "paprika", "courgette", "zucchini", "aubergine", "eggplant", "peas", "erwten", "prei", "leek", "celery", "selderij", "avocado"] },
  { kind: "spice", emoji: "🧂", keywords: ["salt", "zout", "pepper", "peper", "spice", "spices", "kruiden", "cinnamon", "kaneel"] },
];

const RECIPE: FoodVisual = { kind: "recipe", emoji: "🍽️" };
const FALLBACK: FoodVisual = { kind: "other", emoji: "🥄" };

export function foodVisual(food: FoodVisualInput): FoodVisual {
  if (food.source === "recipe") return RECIPE;
  const tokens = [food.name, food.originalName ?? ""].flatMap(wordTokens);
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => tokens.some((token) => tokenHasKeyword(token, keyword)))) {
      return { kind: rule.kind, emoji: rule.emoji };
    }
  }
  return FALLBACK;
}

export function foodEmoji(food: FoodVisualInput): string {
  return foodVisual(food).emoji;
}

function wordTokens(value: string): string[] {
  return foldAlias(value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

function tokenHasKeyword(token: string, keyword: string): boolean {
  if (token === keyword) return true;
  if (keyword.length >= 3 && token.endsWith(keyword)) return true;
  return keyword.length >= 4 && token.startsWith(keyword);
}
