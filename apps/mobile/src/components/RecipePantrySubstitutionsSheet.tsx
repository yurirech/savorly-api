import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PantrySubstitutionResponse } from "@savorly/shared";
import { formatCopyIngredientLine } from "@savorly/shared";
import { tokens } from "../theme/tokens";
import { softWrapText } from "../utils/textWrap";
import { AppText } from "./AppText";
import { Button } from "./Button";

type RecipePantrySubstitutionsSheetProps = {
  visible: boolean;
  result: PantrySubstitutionResponse | null;
  error: string | null;
  applying: boolean;
  onClose: () => void;
  onApply: () => void;
};

export function RecipePantrySubstitutionsSheet(props: RecipePantrySubstitutionsSheetProps) {
  const { visible, result, error, applying, onClose, onApply } = props;
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.frame}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: tokens.space.lg + insets.bottom }]}>
          <AppText variant="title">Pantry swaps</AppText>
          {result ? (
            <>
              <AppText variant="body" color="muted">
                {softWrapText(result.adaptSummary)}
              </AppText>
              <ScrollView style={styles.list}>
                {result.substitutions.map((line) => (
                  <View key={line.originalIndex} style={styles.swapBlock}>
                    <AppText variant="label" color="muted">
                      {line.originalName}
                    </AppText>
                    <AppText variant="body">
                      → {line.pantryStapleLabel}: {formatCopyIngredientLine(line.replacement)}
                    </AppText>
                    <AppText variant="caption" color="muted">
                      {softWrapText(line.rationale)}
                    </AppText>
                  </View>
                ))}
              </ScrollView>
              <Button label="Apply swaps" onPress={onApply} loading={applying} />
            </>
          ) : null}
          {error ? (
            <AppText variant="body" color="danger">
              {error}
            </AppText>
          ) : null}
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
    maxHeight: "85%",
  },
  list: {
    maxHeight: 320,
  },
  swapBlock: {
    gap: tokens.space.xs,
    paddingVertical: tokens.space.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
});
