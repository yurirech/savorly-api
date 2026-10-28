import { Plus, X } from "phosphor-react-native";
import { ActivityIndicator, StyleSheet, View, Pressable } from "react-native";
import type { Ingredient } from "@savorly/shared";
import { formatIngredientLine, isMixInIngredient } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { useTheme, useThemedStyles, type ThemeColors } from "../theme/theme";
import { softWrapText } from "../utils/textWrap";
import { AppText } from "./AppText";

type RecipeIngredientLineProps = {
  ingredient: Ingredient;
  line?: string;
  pantryMatched?: boolean;
  showPantryActions?: boolean;
  quickAddLoading?: boolean;
  onQuickAdd?: () => void;
};

export function RecipeIngredientLine(props: RecipeIngredientLineProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  const { ingredient, line, pantryMatched, showPantryActions, quickAddLoading, onQuickAdd } = props;
  return (
    <View style={styles.row}>
      <AppText variant="body" style={styles.line}>
        {softWrapText(line ?? formatIngredientLine(ingredient))}
      </AppText>
      <View style={styles.trailing}>
        {isMixInIngredient(ingredient) ? (
          <AppText variant="caption" color="accent">
            Mix-in
          </AppText>
        ) : null}
        {showPantryActions && pantryMatched === false ? (
          <View style={styles.missingActions}>
            <X size={16} color={colors.danger} weight="bold" />
            {onQuickAdd ? (
              <Pressable
                onPress={onQuickAdd}
                disabled={quickAddLoading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Add ${ingredient.name} to pantry`}
              >
                {quickAddLoading ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Plus size={18} color={colors.accent} weight="bold" />
                )}
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: tokens.space.sm,
  },
  line: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  trailing: {
    alignItems: "flex-end",
    gap: tokens.space.xs,
  },
  missingActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});
}
