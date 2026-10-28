import { Pressable, ScrollView, StyleSheet } from "react-native";
import { FOOD_CATEGORIES, type FoodCategory } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { useThemedStyles, type ThemeColors } from "../theme/theme";
import { AppText } from "./AppText";

type CategoryPickerProps = {
  value: FoodCategory | null;
  onChange: (value: FoodCategory | null) => void;
  includeAny?: boolean;
};

export function CategoryPicker(props: CategoryPickerProps) {
  const styles = useThemedStyles(createStyles);

  const { value, onChange, includeAny = false } = props;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {includeAny ? (
        <Pressable
          onPress={() => onChange(null)}
          style={[styles.chip, value === null && styles.selected]}
        >
          <AppText variant="caption" style={value === null ? styles.selectedLabel : styles.chipLabel}>
            Any
          </AppText>
        </Pressable>
      ) : null}
      {FOOD_CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            style={[styles.chip, selected && styles.selected]}
          >
            <AppText variant="caption" style={selected ? styles.selectedLabel : styles.chipLabel}>
              {category}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  row: {
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  chip: {
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipLabel: {
    textTransform: "capitalize",
  },
  selectedLabel: {
    color: colors.bg,
    fontFamily: tokens.font.bodyBold,
    textTransform: "capitalize",
  },
});
}

