import { Plus } from "phosphor-react-native";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RecipePantryIngredientStatus, RecipePantryMatchResult } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";
import { Button } from "./Button";

type RecipePantryMissingSheetProps = {
  visible: boolean;
  match: RecipePantryMatchResult | null;
  addingIndex: number | null;
  suggesting: boolean;
  onClose: () => void;
  onQuickAdd: (status: RecipePantryIngredientStatus) => void;
  onSuggestSwaps: () => void;
};

export function RecipePantryMissingSheet(props: RecipePantryMissingSheetProps) {
  const { visible, match, addingIndex, suggesting, onClose, onQuickAdd, onSuggestSwaps } = props;
  const insets = useSafeAreaInsets();
  const missingRows = match?.ingredients.filter((row) => !row.matched) ?? [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.frame}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: tokens.space.lg + insets.bottom }]}>
          <AppText variant="title">Missing from pantry</AppText>
          <ScrollView style={styles.list}>
            {missingRows.map((row) => (
              <View key={row.index} style={styles.row}>
                <AppText variant="body" style={styles.rowLabel}>
                  {row.name}
                </AppText>
                {row.quickAdd ? (
                  <Pressable
                    onPress={() => onQuickAdd(row)}
                    disabled={addingIndex === row.index}
                    style={styles.addBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${row.name} to pantry`}
                  >
                    {addingIndex === row.index ? (
                      <ActivityIndicator size="small" color={tokens.accent} />
                    ) : (
                      <Plus size={20} color={tokens.accent} weight="bold" />
                    )}
                  </Pressable>
                ) : null}
              </View>
            ))}
          </ScrollView>
          <Button
            label="Suggest swaps from pantry"
            onPress={onSuggestSwaps}
            loading={suggesting}
            disabled={missingRows.length === 0}
          />
          <Button label="Close" variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: tokens.bgElevated,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.md,
    maxHeight: "80%",
  },
  list: {
    maxHeight: 280,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  rowLabel: {
    flex: 1,
    minWidth: 0,
  },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
