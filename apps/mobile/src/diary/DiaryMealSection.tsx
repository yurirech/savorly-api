import { CaretDown, CaretUp, ChartPie, PencilSimple, Trash } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View } from "react-native";
import { listPresentNutrients, type DiaryEntry, type DiaryMealGroup } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import NutrientDetailList from "../components/NutrientDetailList";
import { tokens } from "../theme/tokens";

interface DiaryMealSectionProps {
  meal: DiaryMealGroup;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onPressEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (entry: DiaryEntry) => void;
  onCopyEntry: (entryIds: string[]) => void;
  onAddFood: () => void;
  onCopyPrevious?: () => void;
  onAddStaples?: () => void;
  onRename: () => void;
  onDelete: () => void;
}

function formatMealMacros(meal: DiaryMealGroup): string {
  const { totals } = meal;
  return `${totals.kcal} kcal · ${totals.proteinG}g protein · ${totals.carbsG}g carbs · ${totals.fatG}g fat`;
}

function DiaryMealSection(props: DiaryMealSectionProps) {
  const {
    meal,
    collapsed,
    onToggleCollapse,
    onPressEntry,
    onDeleteEntry,
    onCopyEntry,
    onAddFood,
    onCopyPrevious,
    onAddStaples,
    onRename,
    onDelete,
  } = props;
  const [nutrientsOpen, setNutrientsOpen] = useState(false);
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const nutrientGroups = listPresentNutrients(meal.totals);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Pressable
          onPress={onToggleCollapse}
          style={styles.headerCopy}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={`${meal.name}, ${formatMealMacros(meal)}`}
        >
          <AppText variant="title">{meal.name}</AppText>
          <AppText variant="caption" color="muted">
            {formatMealMacros(meal)}
          </AppText>
        </Pressable>
        <Pressable onPress={onRename} hitSlop={8} accessibilityRole="button" accessibilityLabel="Rename">
          <PencilSimple size={20} color={tokens.text} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} accessibilityRole="button" accessibilityLabel="Delete group">
          <Trash size={20} color={tokens.danger} />
        </Pressable>
        <Pressable
          onPress={onToggleCollapse}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Expand group" : "Collapse group"}
        >
          {collapsed ? <CaretDown size={20} color={tokens.text} /> : <CaretUp size={20} color={tokens.text} />}
        </Pressable>
      </View>
      {!collapsed && (
        <View style={styles.body}>
          {meal.entries.length === 0 ? (
            <AppText variant="body" color="muted">
              No foods logged in this group yet.
            </AppText>
          ) : null}
          {meal.entries.map((entry) => (
            <DiaryEntryRow
              key={entry.id}
              entry={entry}
              active={openEntryId === entry.id}
              onActivate={() => setOpenEntryId(entry.id)}
              onPress={() => onPressEntry(entry)}
              onDelete={() => onDeleteEntry(entry)}
              onCopy={() => onCopyEntry([entry.id])}
            />
          ))}
          <View style={styles.actions}>
            <Button size="compact" label="Add food" variant="secondary" onPress={onAddFood} />
            {meal.entries.length === 0 && onCopyPrevious ? (
              <Pressable onPress={onCopyPrevious} hitSlop={8} accessibilityRole="button" accessibilityLabel="Copy last time">
                <AppText variant="body">↩</AppText>
              </Pressable>
            ) : null}
            {meal.entries.length === 0 && onAddStaples ? (
              <Pressable onPress={onAddStaples} hitSlop={8} accessibilityRole="button" accessibilityLabel="Add staples">
                <AppText variant="body">🥣</AppText>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => setNutrientsOpen((open) => !open)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={nutrientsOpen ? "Hide nutrients" : "Nutrients"}
            >
              <ChartPie size={22} color={nutrientsOpen ? tokens.accent : tokens.text} />
            </Pressable>
          </View>
          {nutrientsOpen ? <NutrientDetailList groups={nutrientGroups} /> : null}
        </View>
      )}
    </View>
  );
}

const SWIPE_LIMIT = 120;
const SWIPE_TRIGGER = 56;

interface DiaryEntryRowProps {
  entry: DiaryEntry;
  active: boolean;
  onActivate: () => void;
  onPress: () => void;
  onDelete: () => void;
  onCopy: () => void;
}

function DiaryEntryRow(props: DiaryEntryRowProps) {
  const { entry, active, onActivate, onPress, onDelete, onCopy } = props;
  const [offset, setOffset] = useState(0);
  const dragged = useRef(false);
  const actions = useRef({ onActivate, onDelete, onCopy });
  actions.current = { onActivate, onDelete, onCopy };

  useEffect(() => {
    if (!active) {
      setOffset(0);
    }
  }, [active]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        dragged.current = false;
        actions.current.onActivate();
      },
      onPanResponderMove: (_event, gesture) => {
        if (Math.abs(gesture.dx) > 12) {
          dragged.current = true;
        }
        setOffset(Math.max(-SWIPE_LIMIT, Math.min(SWIPE_LIMIT, gesture.dx)));
      },
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx <= -SWIPE_TRIGGER) {
          actions.current.onDelete();
        } else if (gesture.dx >= SWIPE_TRIGGER) {
          actions.current.onCopy();
        }
        setOffset(0);
      },
      onPanResponderTerminate: () => {
        setOffset(0);
      },
    }),
  ).current;

  const caption =
    entry.kind === "quick"
      ? `${entry.nutrients.kcal} kcal · ${entry.nutrients.proteinG}g protein · ${entry.nutrients.carbsG}g carbs · ${entry.nutrients.fatG}g fat`
      : `${entry.grams} g · ${entry.nutrients.kcal} kcal`;

  return (
    <View style={styles.swipe} {...pan.panHandlers}>
      {offset > 0 ? (
        <View style={[styles.underlay, styles.copyUnder]}>
          <AppText variant="caption" style={styles.copyLabel}>
            Copy
          </AppText>
        </View>
      ) : null}
      {offset < 0 ? (
        <View style={[styles.underlay, styles.deleteUnder]}>
          <AppText variant="caption" style={styles.deleteLabel}>
            Delete
          </AppText>
        </View>
      ) : null}
      <Pressable
        onPress={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          onPress();
        }}
        style={[styles.entryRow, { transform: [{ translateX: offset }] }]}
        accessibilityRole="button"
        accessibilityLabel={entry.kind === "quick" ? `${entry.foodName}, ${entry.nutrients.kcal} kcal` : `${entry.foodName}, ${entry.grams} grams`}
      >
        <View style={styles.entryCopy}>
          <AppText variant="body">{entry.foodName}</AppText>
          <AppText variant="caption" color="muted">
            {caption}
          </AppText>
        </View>
      </Pressable>
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
    padding: tokens.space.md,
    gap: tokens.space.sm,
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
    backgroundColor: tokens.surface,
  },
  swipe: {
    overflow: "hidden",
    justifyContent: "center",
  },
  underlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    paddingHorizontal: tokens.space.md,
  },
  copyUnder: {
    alignItems: "flex-start",
    backgroundColor: tokens.accent,
  },
  deleteUnder: {
    alignItems: "flex-end",
    backgroundColor: tokens.danger,
  },
  copyLabel: {
    color: tokens.bg,
  },
  deleteLabel: {
    color: tokens.text,
  },
  entryCopy: {
    gap: tokens.space.xs,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
    marginTop: tokens.space.sm,
  },
});

export default DiaryMealSection;
