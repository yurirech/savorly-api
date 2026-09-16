import { router, type Href } from "expo-router";
import { Bread, Cake, ChefHat, IceCream } from "phosphor-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { CreateAgent, GeneratedRecipe, RecipeGenerateRequest } from "@savorly/shared";
import { ApiRequestError, generateRecipe } from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { setReviewDraft } from "../../../src/store/reviewDraft";
import { tokens } from "../../../src/theme/tokens";

const AGENTS: { value: CreateAgent; label: string; subtitle: string; icon: ReactNode }[] = [
  { value: "creami", label: "Creami", subtitle: "Ninja Creami ice cream", icon: <IceCream size={22} color={tokens.accent} weight="fill" /> },
  { value: "bread", label: "Bread", subtitle: "Bread machine loaves", icon: <Bread size={22} color={tokens.accent} weight="fill" /> },
  { value: "bake", label: "Bake", subtitle: "Cakes and bakes", icon: <Cake size={22} color={tokens.accent} weight="fill" /> },
  { value: "chef", label: "Chef", subtitle: "Savory or dessert", icon: <ChefHat size={22} color={tokens.accent} weight="fill" /> },
];

export default function CreateScreen() {
  const [agent, setAgent] = useState<CreateAgent>("creami");
  const [size, setSize] = useState<"big" | "small">("small");
  const [macros, setMacros] = useState<"lean" | "balanced">("lean");
  const [base, setBase] = useState<"lean" | "mixed">("mixed");
  const [texture, setTexture] = useState<"gelato" | "standard">("gelato");
  const [sweetener, setSweetener] = useState<"stevia" | "sucralose" | "both">("stevia");
  const [flavor, setFlavor] = useState("");
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
        base,
        texture,
        sweetener,
        flavor: flavor.trim() || undefined,
        notes: notes.trim() || undefined,
        previousRecipe: nextAdapt && recipe ? recipe : undefined,
        adaptNote: nextAdapt || undefined,
      };
    }
    return {
      agent,
      notes,
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
    <Screen>
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
              { value: "big", label: "Big" },
              { value: "small", label: "Small" },
            ]}
          />
          <OptionLabel label="Macros" />
          <SegmentedControl
            value={macros}
            onChange={setMacros}
            disabled={locked}
            options={[
              { value: "lean", label: "Lean" },
              { value: "balanced", label: "Balanced" },
            ]}
          />
          <OptionLabel label="Base" />
          <SegmentedControl
            value={base}
            onChange={setBase}
            disabled={locked}
            options={[
              { value: "lean", label: "Lean base" },
              { value: "mixed", label: "Mixed base" },
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
            value={sweetener}
            onChange={setSweetener}
            disabled={locked}
            options={[
              { value: "stevia", label: "Stevia" },
              { value: "sucralose", label: "Sucralose" },
              { value: "both", label: "Both" },
            ]}
          />
          <Field
            label="Flavor"
            value={flavor}
            onChangeText={setFlavor}
            placeholder="Leave blank for a suggestion"
            editable={!locked}
          />
          <Field
            label="Additional info"
            value={notes}
            onChangeText={setNotes}
            placeholder="Mix-ins, powders you have, constraints"
            multiline
            editable={!locked}
          />
        </View>
      ) : (
        <Field
          label="What should we cook?"
          value={notes}
          onChangeText={setNotes}
          placeholder="Leave blank for a suggestion"
          multiline
          editable={!locked}
        />
      )}

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
          {recipe.ingredients.map((ingredient) => (
            <AppText key={`${ingredient.name}-${ingredient.unit}`} variant="body">
              {formatIngredient(ingredient)}
            </AppText>
          ))}
          <AppText variant="label" color="muted">
            Steps
          </AppText>
          {recipe.steps.map((step) => (
            <AppText key={step.order} variant="body">
              {step.order}. {step.text}
            </AppText>
          ))}
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

function formatIngredient(ingredient: GeneratedRecipe["ingredients"][number]): string {
  const qty = ingredient.quantity != null ? String(ingredient.quantity) : "";
  return [qty, ingredient.unit, ingredient.name].filter(Boolean).join(" ");
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
