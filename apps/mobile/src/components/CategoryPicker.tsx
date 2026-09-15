import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { FOOD_CATEGORIES, type FoodCategory } from "@savorly/shared";
import { tokens } from "../theme/tokens";

type CategoryPickerProps = {
  value: FoodCategory;
  onChange: (value: FoodCategory) => void;
};

export function CategoryPicker(props: CategoryPickerProps) {
  const { value, onChange } = props;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FOOD_CATEGORIES.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            onPress={() => onChange(category)}
            style={[styles.chip, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{category}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: tokens.space.sm,
    paddingVertical: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: tokens.surface,
  },
  selected: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
  },
  label: {
    color: tokens.text,
    fontSize: tokens.type.caption,
    textTransform: "capitalize",
  },
  selectedLabel: {
    color: tokens.background,
    fontWeight: "700",
  },
});
