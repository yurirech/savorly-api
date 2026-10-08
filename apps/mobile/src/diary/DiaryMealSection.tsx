import { CaretDown, CaretUp, ChartPie, Check, PencilSimple, Trash } from "phosphor-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, View } from "react-native";
import {
  foodEmoji,
  listPresentNutrients,
  resolveFoodGrams,
  type DiaryEntry,
  type DiaryMealGroup,
  type FoodAmountUnit,
} from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import NutrientDetailList from "../components/NutrientDetailList";
import { tokens } from "../theme/tokens";
import FoodAmountFields, { parseFoodAmount } from "./FoodAmountFields";
import FoodEmojiBadge from "./FoodEmojiBadge";

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
  editing: boolean;
  selecting: boolean;
  selectedIds: ReadonlySet<string>;
  onStartSelect: (entry: DiaryEntry) => void;
  onToggleSelect: (entry: DiaryEntry) => void;
  amountEntryId: string | null;
  savingAmount: boolean;
  onSaveAmount: (entry: DiaryEntry, grams: number) => void;
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
    editing,
    selecting,
    selectedIds,
    onStartSelect,
    onToggleSelect,
    amountEntryId,
    savingAmount,
    onSaveAmount,
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
        {editing ? (
          <IconButton label="Rename" onPress={onRename}>
            <PencilSimple size={22} color={tokens.text} />
          </IconButton>
        ) : null}
        {editing ? (
          <IconButton label="Delete group" onPress={onDelete}>
            <Trash size={22} color={tokens.danger} />
          </IconButton>
        ) : null}
        <IconButton label={collapsed ? "Expand group" : "Collapse group"} onPress={onToggleCollapse}>
          {collapsed ? <CaretDown size={22} color={tokens.text} /> : <CaretUp size={22} color={tokens.text} />}
        </IconButton>
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
              selecting={selecting}
              selected={selectedIds.has(entry.id)}
              onActivate={() => setOpenEntryId(entry.id)}
              onPress={() => onPressEntry(entry)}
              onDelete={() => onDeleteEntry(entry)}
              onCopy={() => onCopyEntry([entry.id])}
              onStartSelect={() => onStartSelect(entry)}
              onToggleSelect={() => onToggleSelect(entry)}
              editingAmount={amountEntryId === entry.id}
              savingAmount={savingAmount}
              onSaveAmount={(grams) => onSaveAmount(entry, grams)}
            />
          ))}
          <View style={styles.actions}>
            <View style={styles.addFoodSlot}>
              <Button size="compact" label="Add food" variant="secondary" onPress={onAddFood} />
            </View>
            {meal.entries.length === 0 && onCopyPrevious ? (
              <IconButton label="Copy last time" onPress={onCopyPrevious}>
                <AppText variant="body">↩</AppText>
              </IconButton>
            ) : null}
            {meal.entries.length === 0 && onAddStaples ? (
              <IconButton label="Add staples" onPress={onAddStaples}>
                <AppText variant="body">🥣</AppText>
              </IconButton>
            ) : null}
            <IconButton
              label={nutrientsOpen ? "Hide nutrients" : "Nutrients"}
              onPress={() => setNutrientsOpen((open) => !open)}
            >
              <ChartPie size={22} color={nutrientsOpen ? tokens.accent : tokens.text} />
            </IconButton>
          </View>
          {nutrientsOpen ? <NutrientDetailList groups={nutrientGroups} /> : null}
        </View>
      )}
    </View>
  );
}

const SWIPE_LIMIT = 120;
const SWIPE_TRIGGER = 56;

interface IconButtonProps {
  label: string;
  onPress: () => void;
  children: ReactNode;
}

function IconButton(props: IconButtonProps) {
  const { label, onPress, children } = props;
  return (
    <Pressable onPress={onPress} style={styles.iconButton} accessibilityRole="button" accessibilityLabel={label}>
      {children}
    </Pressable>
  );
}

interface DiaryEntryRowProps {
  entry: DiaryEntry;
  active: boolean;
  selecting: boolean;
  selected: boolean;
  onActivate: () => void;
  onPress: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onStartSelect: () => void;
  onToggleSelect: () => void;
  editingAmount: boolean;
  savingAmount: boolean;
  onSaveAmount: (grams: number) => void;
}

function DiaryEntryRow(props: DiaryEntryRowProps) {
  const {
    entry,
    active,
    selecting,
    selected,
    onActivate,
    onPress,
    onDelete,
    onCopy,
    onStartSelect,
    onToggleSelect,
    editingAmount,
    savingAmount,
    onSaveAmount,
  } = props;
  const [offset, setOffset] = useState(0);
  const [amount, setAmount] = useState(String(entry.grams));
  const [unit, setUnit] = useState<FoodAmountUnit>("grams");
  const [servingWeightG, setServingWeightG] = useState<number | null>(null);
  const editorFade = useRef(new Animated.Value(0)).current;
  const editorSlide = useRef(new Animated.Value(8)).current;
  const dragged = useRef(false);
  const actions = useRef({ onActivate, onDelete, onCopy });
  actions.current = { onActivate, onDelete, onCopy };

  useEffect(() => {
    if (!active) {
      setOffset(0);
    }
  }, [active]);

  useEffect(() => {
    setAmount(String(entry.grams));
    setUnit("grams");
  }, [editingAmount, entry.grams]);

  useEffect(() => {
    if (!editingAmount) return;
    editorFade.setValue(0);
    editorSlide.setValue(8);
    Animated.parallel([
      Animated.timing(editorFade, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(editorSlide, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [editingAmount, editorFade, editorSlide]);

  useEffect(() => {
    if (!editingAmount || !entry.foodId) {
      setServingWeightG(null);
      return;
    }
    let activeLoad = true;
    void import("../offline/store").then(({ readFood }) =>
      readFood(entry.foodId as string).then((food) => {
        if (!activeLoad) return;
        setServingWeightG(food?.servingWeightG ?? null);
      }),
    );
    return () => {
      activeLoad = false;
    };
  }, [editingAmount, entry.foodId]);

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
    <View style={styles.swipe} {...(selecting ? {} : pan.panHandlers)}>
      {!selecting && offset > 0 ? (
        <View style={[styles.underlay, styles.copyUnder]}>
          <AppText variant="caption" style={styles.copyLabel}>
            Copy
          </AppText>
        </View>
      ) : null}
      {!selecting && offset < 0 ? (
        <View style={[styles.underlay, styles.deleteUnder]}>
          <AppText variant="caption" style={styles.deleteLabel}>
            Delete
          </AppText>
        </View>
      ) : null}
      <Pressable
        onPress={() => {
          if (selecting) {
            onToggleSelect();
            return;
          }
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          onPress();
        }}
        onLongPress={onStartSelect}
        delayLongPress={350}
        style={[styles.entryRow, { transform: [{ translateX: selecting ? 0 : offset }] }]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={entry.kind === "quick" ? `${entry.foodName}, ${entry.nutrients.kcal} kcal` : `${entry.foodName}, ${entry.grams} grams`}
      >
        {selecting ? (
          <View style={[styles.check, selected && styles.checkOn]}>
            {selected ? <Check size={16} color={tokens.bg} weight="bold" /> : null}
          </View>
        ) : null}
        <FoodEmojiBadge emoji={entry.kind === "quick" ? "⚡" : foodEmoji({ name: entry.foodName })} />
        <View style={styles.entryCopy}>
          <AppText variant="body">{entry.foodName}</AppText>
          <AppText variant="caption" color="muted">
            {caption}
          </AppText>
        </View>
      </Pressable>
      {editingAmount ? (
        <Animated.View style={[styles.amountEditor, { opacity: editorFade, transform: [{ translateY: editorSlide }] }]}>
          <FoodAmountFields
            unit={unit}
            amount={amount}
            servingWeightG={servingWeightG}
            frequentGrams={[]}
            onUnitChange={setUnit}
            onAmountChange={setAmount}
          />
          <Button
            size="compact"
            label="OK"
            loading={savingAmount}
            onPress={() => {
              const parsed = parseFoodAmount(amount);
              const grams = parsed == null ? null : resolveFoodGrams(unit, parsed, servingWeightG);
              if (grams == null || grams <= 0) return;
              onSaveAmount(grams);
            }}
          />
        </Animated.View>
      ) : null}
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
  addFoodSlot: {
    height: 44,
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    backgroundColor: tokens.surface,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: tokens.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: tokens.accent,
    borderColor: tokens.accent,
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
    flex: 1,
    gap: tokens.space.xs,
  },
  amountEditor: {
    gap: tokens.space.sm,
    paddingBottom: tokens.space.sm,
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
