import { CaretDown, CaretUp } from "phosphor-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { DiaryEntry, DiaryMealGroup } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";

interface DiaryMealSectionProps {
  meal: DiaryMealGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPressEntry: (entry: DiaryEntry) => void;
  onAddFood: () => void;
  onQuickCal: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function formatMealMacros(meal: DiaryMealGroup): string {
  const { totals } = meal;
  return `${totals.kcal} kcal · ${totals.proteinG}g protein · ${totals.carbsG}g carbs · ${totals.fatG}g fat`;
}

function DiaryMealSection(props: DiaryMealSectionProps) {
  const { meal, collapsed, onToggleCollapse, onPressEntry, onAddFood, onQuickCal, onRename, onDelete } = props;

  return (
    <View style={styles.section}>
      <Pressable
        onPress={onToggleCollapse}
        style={styles.header}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={`${meal.name}, ${formatMealMacros(meal)}`}
      >
        <View style={styles.headerCopy}>
          <AppText variant="title">{meal.name}</AppText>
          <AppText variant="caption" color="muted">
            {formatMealMacros(meal)}
          </AppText>
        </View>
        {collapsed ? <CaretDown size={20} color={tokens.text} /> : <CaretUp size={20} color={tokens.text} />}
      </Pressable>
      {!collapsed && (
        <View style={styles.body}>
          {meal.entries.length === 0 ? (
            <AppText variant="body" color="muted">
              No foods logged in this group yet.
            </AppText>
          ) : null}
          {meal.entries.map((entry) => (
            <Pressable
              key={entry.id}
              onPress={() => onPressEntry(entry)}
              style={styles.entryRow}
              accessibilityRole="button"
              accessibilityLabel={
                entry.kind === "quick"
                  ? `${entry.foodName}, ${entry.nutrients.kcal} kcal`
                  : `${entry.foodName}, ${entry.grams} grams`
              }
            >
              <View style={styles.entryCopy}>
                <AppText variant="body">{entry.foodName}</AppText>
                <AppText variant="caption" color="muted">
                  {entry.kind === "quick"
                    ? `${entry.nutrients.kcal} kcal · ${entry.nutrients.proteinG}g protein · ${entry.nutrients.carbsG}g carbs · ${entry.nutrients.fatG}g fat`
                    : `${entry.grams} g · ${entry.nutrients.kcal} kcal`}
                </AppText>
              </View>
            </Pressable>
          ))}
          <View style={styles.actions}>
            <Button label="Add food" variant="secondary" onPress={onAddFood} />
            <Button label="Quick calories" variant="secondary" onPress={onQuickCal} />
            <Button label="Rename" variant="ghost" onPress={onRename} />
            <Button label="Delete group" variant="ghost" onPress={onDelete} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.surface,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: tokens.space.md,
    gap: tokens.space.md,
  },
  headerCopy: {
    flex: 1,
    gap: tokens.space.xs,
  },
  body: {
    paddingHorizontal: tokens.space.md,
    paddingBottom: tokens.space.md,
    gap: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
  },
  entryRow: {
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  entryCopy: {
    gap: tokens.space.xs,
  },
  actions: {
    gap: tokens.space.xs,
    marginTop: tokens.space.sm,
  },
});

export default DiaryMealSection;
