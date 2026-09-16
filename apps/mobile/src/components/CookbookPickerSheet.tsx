import { Check } from "phosphor-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { CookbookSummary } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";
import { Button } from "./Button";

type CookbookPickerSheetProps = {
  visible: boolean;
  cookbooks: CookbookSummary[];
  selectedIds: string[];
  saving?: boolean;
  onToggle: (id: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function CookbookPickerSheet(props: CookbookPickerSheetProps) {
  const { visible, cookbooks, selectedIds, saving, onToggle, onSave, onClose } = props;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.frame}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <AppText variant="title">Add to cookbooks</AppText>
          {cookbooks.length === 0 ? (
            <AppText variant="body" color="muted">
              Create a cookbook first, then you can file this recipe.
            </AppText>
          ) : (
            <ScrollView style={styles.list}>
              {cookbooks.map((cookbook) => {
                const selected = selectedIds.includes(cookbook.id);
                return (
                  <Pressable
                    key={cookbook.id}
                    onPress={() => onToggle(cookbook.id)}
                    style={[styles.row, selected && styles.rowSelected]}
                  >
                    <View style={styles.rowCopy}>
                      <AppText variant="title">{cookbook.name}</AppText>
                      <AppText variant="caption" color="muted">
                        {cookbook.recipeCount === 1 ? "1 recipe" : `${cookbook.recipeCount} recipes`}
                      </AppText>
                    </View>
                    {selected ? (
                      <Check size={20} color={tokens.accent} weight="bold" />
                    ) : (
                      <View style={styles.unchecked} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Button label="Save" onPress={onSave} loading={saving} disabled={cookbooks.length === 0} />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
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
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: tokens.bg,
    opacity: 0.72,
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
    maxHeight: 360,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: tokens.space.md,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  rowSelected: {
    borderBottomColor: tokens.accent,
  },
  rowCopy: {
    flex: 1,
    paddingRight: tokens.space.md,
    gap: tokens.space.xs,
  },
  unchecked: {
    width: 20,
    height: 20,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.border,
  },
});
