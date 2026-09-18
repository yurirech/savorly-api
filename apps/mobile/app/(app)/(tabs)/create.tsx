import { router, type Href } from "expo-router";
import { Bread, Cake, ChefHat, IceCream } from "phosphor-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type {
  BakeKind,
  BakeStyle,
  BreadLoafSize,
  BreadStyle,
  ChefMealType,
  ChefServings,
  ChefStyle,
  CreateAgent,
  CreamiSweetenerKind,
  GeneratedRecipe,
  RecipeGenerateRequest,
} from "@savorly/shared";
import { isCreamiRecipe } from "@savorly/shared";
import { ApiRequestError, generateRecipe } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { RecipeIngredientLine } from "../../../src/components/RecipeIngredientLine";
import { RecipeNutritionSummary } from "../../../src/components/RecipeNutritionSummary";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { setReviewDraft } from "../../../src/store/reviewDraft";
import { tokens } from "../../../src/theme/tokens";

const AGENTS: { value: CreateAgent; label: string; subtitle: string; icon: ReactNode }[] = [
  { value: "creami", label: "Creami", subtitle: "Ninja Creami ice cream", icon: <IceCream size={22} color={tokens.accent} weight="fill" /> },
  { value: "bread", label: "Bread", subtitle: "Machine loaves and doughs", icon: <Bread size={22} color={tokens.accent} weight="fill" /> },
  { value: "bake", label: "Bake", subtitle: "Cakes, muffins, cupcakes", icon: <Cake size={22} color={tokens.accent} weight="fill" /> },
  { value: "chef", label: "Chef", subtitle: "Savory or dessert", icon: <ChefHat size={22} color={tokens.accent} weight="fill" /> },
];

export default function CreateScreen() {
  const [agent, setAgent] = useState<CreateAgent>("creami");
  const [size, setSize] = useState<"big" | "small">("big");
  const [macros, setMacros] = useState<"lean" | "balanced">("balanced");
  const [texture, setTexture] = useState<"gelato" | "standard">("standard");
  const [sweetenerKind, setSweetenerKind] = useState<CreamiSweetenerKind>("lightweight");
  const [sweetenerName, setSweetenerName] = useState("");
  const [flavor, setFlavor] = useState("");
  const [mealType, setMealType] = useState<ChefMealType>("main");
  const [servings, setServings] = useState<"1" | "2" | "4">("2");
  const [style, setStyle] = useState<ChefStyle>("regular");
  const [loafSize, setLoafSize] = useState<BreadLoafSize>("large");
  const [breadStyle, setBreadStyle] = useState<BreadStyle>("regular");
  const [bakeKind, setBakeKind] = useState<BakeKind>("cake");
  const [bakeStyle, setBakeStyle] = useState<BakeStyle>("regular");
  const [notes, setNotes] = useState("");
  const [adaptNote, setAdaptNote] = useState("");
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = recipe !== null;

  function buildRequest(nextAdapt?: string): RecipeGenerateRequest {
    if (agent === "creami") {
      return {
        agent: "creami",
        size,
        macros,
        texture,
        sweetenerKind,
        sweetenerName: sweetenerName.trim() || undefined,
        flavor: flavor.trim() || undefined,
        notes: notes.trim() || undefined,
        previousRecipe: nextAdapt && recipe ? recipe : undefined,
        adaptNote: nextAdapt || undefined,
      };
    }
    if (agent === "chef") {
      return {
        agent: "chef",
        mealType,
        servings: Number(servings) as ChefServings,
        style,
        notes: notes.trim() || undefined,
        previousRecipe: nextAdapt && recipe ? recipe : undefined,
        adaptNote: nextAdapt || undefined,
      };
    }
    if (agent === "bread") {
      return {
        agent: "bread",
        size: loafSize,
        style: breadStyle,
        notes: notes.trim() || undefined,
        previousRecipe: nextAdapt && recipe ? recipe : undefined,
        adaptNote: nextAdapt || undefined,
      };
    }
    return {
      agent: "bake",
      kind: bakeKind,
      style: bakeStyle,
      notes: notes.trim() || undefined,
      previousRecipe: nextAdapt && recipe ? recipe : undefined,
      adaptNote: nextAdapt || undefined,
    };
  }

  async function runGenerate(nextAdapt?: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await generateRecipe(buildRequest(nextAdapt));
      setRecipe(result.recipe);
      setAdaptNote("");
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not generate this recipe.");
    } finally {
      setLoading(false);
    }
  }

  function startOver() {
    setRecipe(null);
    setAdaptNote("");
    setError(null);
  }

  function looksGood() {
    if (!recipe) return;
    setReviewDraft(recipe);
    router.push("/(app)/review" as Href);
  }

  return (
    <Screen safeBottom={false}>
      <AppText variant="label" color="accent">
        Create
      </AppText>
      <AppText variant="display">Cook with AI</AppText>
      <AppText variant="body" color="muted">
        Pick an agent, set a few options, then adapt until it is yours.
      </AppText>

      <View style={styles.agentGrid}>
        {AGENTS.map((item) => {
          const selected = agent === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => !locked && setAgent(item.value)}
              disabled={locked}
              style={[styles.agentCard, selected && styles.agentSelected, locked && styles.locked]}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled: locked }}
            >
              <View style={styles.agentIcon}>{item.icon}</View>
              <AppText variant="title">{item.label}</AppText>
              <AppText variant="caption" color="muted">
                {item.subtitle}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {agent === "creami" ? (
        <View style={styles.form}>
          <OptionLabel label="Size" />
          <SegmentedControl
            value={size}
            onChange={setSize}
            disabled={locked}
            options={[
              { value: "small", label: "Normal" },
              { value: "big", label: "Big" },
            ]}
          />
          <OptionLabel label="Tier" />
          <SegmentedControl
            value={macros}
            onChange={setMacros}
            disabled={locked}
            options={[
              { value: "lean", label: "Lean" },
              { value: "balanced", label: "Balanced" },
            ]}
          />
          <OptionLabel label="Texture" />
          <SegmentedControl
            value={texture}
            onChange={setTexture}
            disabled={locked}
            options={[
              { value: "gelato", label: "Gelato" },
              { value: "standard", label: "Standard" },
            ]}
          />
          <OptionLabel label="Sweetener" />
          <SegmentedControl
            value={sweetenerKind}
            onChange={(value) => {
              setSweetenerKind(value);
              setSweetenerName("");
            }}
            disabled={locked}
            options={[
              { value: "bulky", label: "Bulky" },
              { value: "lightweight", label: "Lightweight" },
            ]}
          />
          <Field
            label="Which sweetener?"
            value={sweetenerName}
            onChangeText={setSweetenerName}
            placeholder={
              sweetenerKind === "bulky"
                ? "xylitol, erythritol, allulose…"
                : "stevia, liquid stevia, monk fruit…"
            }
            editable={!locked}
          />
          <Field
            label="Flavor"
            value={flavor}
            onChangeText={setFlavor}
            placeholder="strawberry and white chocolate"
            editable={!locked}
          />
          <Field
            label="Additional info"
            value={notes}
            onChangeText={setNotes}
            placeholder="Extra-lean, mix-ins, powders you have, constraints"
            multiline
            editable={!locked}
          />
        </View>
      ) : null}

      {agent === "chef" ? (
        <View style={styles.form}>
          <OptionLabel label="Meal type" />
          <SegmentedControl
            value={mealType}
            onChange={setMealType}
            disabled={locked}
            options={[
              { value: "main", label: "Main" },
              { value: "side", label: "Side" },
              { value: "snack", label: "Snack" },
            ]}
          />
          <OptionLabel label="Servings" />
          <SegmentedControl
            value={servings}
            onChange={setServings}
            disabled={locked}
            options={[
              { value: "1", label: "1" },
              { value: "2", label: "2" },
              { value: "4", label: "4" },
            ]}
          />
          <OptionLabel label="Style" />
          <SegmentedControl
            value={style}
            onChange={setStyle}
            disabled={locked}
            options={[
              { value: "regular", label: "Regular" },
              { value: "lighter", label: "Lighter" },
              { value: "nutritious", label: "More nutritious" },
            ]}
          />
          <Field
            label="What should we cook?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Creamy mushroom pasta, leftover chicken, or blank"
            multiline
            editable={!locked}
          />
        </View>
      ) : null}

      {agent === "bread" ? (
        <View style={styles.form}>
          <OptionLabel label="Size" />
          <SegmentedControl
            value={loafSize}
            onChange={setLoafSize}
            disabled={locked}
            options={[
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
          <OptionLabel label="Style" />
          <SegmentedControl
            value={breadStyle}
            onChange={setBreadStyle}
            disabled={locked}
            options={[
              { value: "regular", label: "Regular" },
              { value: "lighter", label: "Lighter" },
            ]}
          />
          <Field
            label="What should we bake?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Honey oat, rye, pizza dough, or blank"
            multiline
            editable={!locked}
          />
        </View>
      ) : null}

      {agent === "bake" ? (
        <View style={styles.form}>
          <OptionLabel label="Kind" />
          <SegmentedControl
            value={bakeKind}
            onChange={setBakeKind}
            disabled={locked}
            options={[
              { value: "cake", label: "Cake" },
              { value: "muffin", label: "Muffin" },
              { value: "cupcake", label: "Cupcake" },
              { value: "other", label: "Other" },
            ]}
          />
          <OptionLabel label="Style" />
          <SegmentedControl
            value={bakeStyle}
            onChange={setBakeStyle}
            disabled={locked}
            options={[
              { value: "regular", label: "Regular" },
              { value: "lighter", label: "Lighter" },
            ]}
          />
          <Field
            label="What should we bake?"
            value={notes}
            onChangeText={setNotes}
            placeholder="Strawberries and lemon, or blank"
            multiline
            editable={!locked}
          />
        </View>
      ) : null}

      {recipe ? (
        <View style={styles.result}>
          <AppText variant="label" color="accent">
            Draft
          </AppText>
          <AppText variant="title">{recipe.title}</AppText>
          <AppText variant="caption" color="muted">
            {recipe.source.sourceName} · {recipe.category}
          </AppText>
          <AppText variant="label" color="muted">
            Ingredients
          </AppText>
          {recipe.ingredients.map((ingredient, index) => (
            <RecipeIngredientLine key={`${index}-${ingredient.name}`} ingredient={ingredient} />
          ))}
          {!isCreamiRecipe(recipe) && recipe.steps.length > 0 ? (
            <>
              <AppText variant="label" color="muted">
                Steps
              </AppText>
              {recipe.steps.map((step) => (
                <AppText key={step.order} variant="body">
                  {step.order}. {step.text}
                </AppText>
              ))}
            </>
          ) : null}
          <RecipeNutritionSummary nutrition={recipe.nutrition} />
          <Field
            label="Adapt"
            value={adaptNote}
            onChangeText={setAdaptNote}
            placeholder="I don't have that powder, use cocoa"
            multiline
          />
        </View>
      ) : null}

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      {recipe ? (
        <>
          <Button
            label="Adapt"
            variant="secondary"
            onPress={() => void runGenerate(adaptNote.trim())}
            loading={loading}
            disabled={!adaptNote.trim()}
          />
          <Button label="Looks good" onPress={looksGood} disabled={loading} />
          <Button label="Start over" variant="ghost" onPress={startOver} disabled={loading} />
        </>
      ) : (
        <Button label="Generate" onPress={() => void runGenerate()} loading={loading} />
      )}
    </Screen>
  );
}

function OptionLabel(props: { label: string }) {
  return (
    <AppText variant="label" color="muted">
      {props.label}
    </AppText>
  );
}

const styles = StyleSheet.create({
  agentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  agentCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
    gap: tokens.space.xs,
    minHeight: 108,
  },
  agentSelected: {
    borderColor: tokens.accent,
    backgroundColor: tokens.bgElevated,
  },
  agentIcon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    backgroundColor: tokens.accentMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: tokens.space.xs,
  },
  locked: {
    opacity: 0.55,
  },
  form: {
    gap: tokens.space.md,
  },
  result: {
    gap: tokens.space.sm,
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.md,
  },
});
