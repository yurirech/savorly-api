import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";

interface DiaryConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

function DiaryConfirmSheet(props: DiaryConfirmSheetProps) {
  const { visible, title, message, confirmLabel, onClose, onConfirm, loading } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">{title}</AppText>
          <AppText variant="body">{message}</AppText>
          <View style={styles.actions}>
            <Button size="compact" label={confirmLabel} onPress={onConfirm} loading={loading} />
            <Button size="compact" label="Cancel" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: tokens.scrim,
    justifyContent: "center",
    padding: tokens.space.lg,
  },
  sheet: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});

export default DiaryConfirmSheet;
