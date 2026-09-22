import { Jar } from "phosphor-react-native";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { RecipePantryMatchResult } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type RecipePantryBadgeProps = {
  isComplete: boolean;
  size?: number;
  interactive?: boolean;
  onPressMissing?: () => void;
};

export function RecipePantryBadge(props: RecipePantryBadgeProps) {
  const { isComplete, size = 22, interactive = false, onPressMissing } = props;
  const jarColor = tokens.text;

  if (isComplete) {
    return (
      <View accessibilityLabel="All ingredients in pantry" accessible>
        <Jar size={size} color={jarColor} weight="fill" />
      </View>
    );
  }

  const icon = <Jar size={size} color={jarColor} weight="regular" />;

  if (interactive && onPressMissing) {
    return (
      <Pressable
        onPress={onPressMissing}
        accessibilityRole="button"
        accessibilityLabel="Some ingredients missing from pantry"
        hitSlop={8}
      >
        {icon}
      </Pressable>
    );
  }

  return icon;
}

type RecipePantryStatusProps = {
  match: RecipePantryMatchResult | null;
  loading: boolean;
  hasStaples: boolean;
  onPressMissing: () => void;
};

export function RecipePantryStatusHint(props: Pick<RecipePantryStatusProps, "loading" | "hasStaples">) {
  const { loading, hasStaples } = props;

  if (loading) {
    return (
      <AppText variant="caption" color="muted">
        Checking pantry…
      </AppText>
    );
  }

  if (!hasStaples) {
    return (
      <AppText variant="caption" color="muted">
        Add staples in Pantry to compare ingredients.
      </AppText>
    );
  }

  return null;
}

export function RecipePantryStatus(props: RecipePantryStatusProps) {
  const { match, loading, hasStaples, onPressMissing } = props;

  if (loading) {
    return (
      <View style={styles.iconSlotInline}>
        <ActivityIndicator size="small" color={tokens.textMuted} />
      </View>
    );
  }

  if (!hasStaples || !match) {
    return null;
  }

  return (
    <View style={styles.iconSlotInline}>
      <RecipePantryBadge
        isComplete={match.isComplete}
        interactive={!match.isComplete}
        onPressMissing={onPressMissing}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconSlotInline: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
