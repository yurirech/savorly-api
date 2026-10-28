import { Check, X } from "phosphor-react-native";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { DiaryMealStaple } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";
import { useTheme, useThemedStyles, type ThemeColors } from "../theme/theme";

type DiaryStaplesSheetProps =
  | {
      mode?: "add";
      visible: boolean;
      staples: DiaryMealStaple[];
      selectedIds: ReadonlySet<string>;
      loading?: boolean;
      onToggle: (foodId: string) => void;
      onClose: () => void;
      onConfirm: () => void;
    }
  | {
      mode: "manage";
      visible: boolean;
      staples: DiaryMealStaple[];
      removingId?: string | null;
      onRemove: (foodId: string) => void;
      onClose: () => void;
    };

function DiaryStaplesSheet(props: DiaryStaplesSheetProps) {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);
  const { visible, staples, onClose } = props;
  const managing = props.mode === "manage";
  const onRemove = props.mode === "manage" ? props.onRemove : null;
  const removingId = props.mode === "manage" ? props.removingId : null;
  const selectedIds = props.mode === "manage" ? null : props.selectedIds;
  const onToggle = props.mode === "manage" ? null : props.onToggle;
  const onConfirm = props.mode === "manage" ? null : props.onConfirm;
  const loading = props.mode === "manage" ? false : props.loading;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">{managing ? "Staples" : "Add staples"}</AppText>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {staples.length === 0 && (
              <AppText variant="body" color="muted">
                No staples in this group.
              </AppText>
            )}
            {managing &&
              staples.map((staple) => (
                <View key={staple.foodId} style={styles.row}>
                  <AppText variant="body" style={styles.name}>
                    {staple.name}
                  </AppText>
                  <Pressable
                    onPress={() => onRemove?.(staple.foodId)}
                    disabled={removingId === staple.foodId}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${staple.name} from this group`}
                    style={styles.remove}
                  >
                    <X size={18} color={colors.danger} />
                  </Pressable>
                </View>
              ))}
            {!managing &&
              staples.map((staple) => {
                const selected = selectedIds?.has(staple.foodId) ?? false;
                return (
                  <Pressable
                    key={staple.foodId}
                    onPress={() => onToggle?.(staple.foodId)}
                    style={styles.row}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={staple.name}
                  >
                    <View style={[styles.check, selected && styles.checkOn]}>
                      {selected ? <Check size={16} color={colors.bg} weight="bold" /> : null}
                    </View>
                    <AppText variant="body" style={styles.name}>
                      {staple.name}
                    </AppText>
                  </Pressable>
                );
              })}
          </ScrollView>
          {managing && (
            <View style={styles.actions}>
              <Button size="compact" label="Close" variant="ghost" onPress={onClose} />
            </View>
          )}
          {!managing && (
            <View style={styles.actions}>
              <Button
                size="compact"
                label="Add"
                onPress={() => onConfirm?.()}
                loading={loading}
                disabled={(selectedIds?.size ?? 0) === 0}
              />
              <Button size="compact" label="Cancel" variant="ghost" onPress={onClose} />
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: "center",
    padding: tokens.space.lg,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.md,
    maxHeight: "80%",
  },
  list: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    minHeight: 44,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: tokens.radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  name: {
    flex: 1,
  },
  remove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});
}


export default DiaryStaplesSheet;
