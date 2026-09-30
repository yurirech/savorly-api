import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";

interface DiaryOptionsSheetProps {
  visible: boolean;
  editing: boolean;
  onClose: () => void;
  onToggleEditing: () => void;
  onCalorieTarget: () => void;
  onWeek: () => void;
}

function DiaryOptionsSheet(props: DiaryOptionsSheetProps) {
  const { visible, editing, onClose, onToggleEditing, onCalorieTarget, onWeek } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">Diary</AppText>
          <Button
            size="compact"
            label={editing ? "Done editing" : "Edit diary"}
            variant="secondary"
            onPress={onToggleEditing}
          />
          <Button size="compact" label="Calorie target" variant="secondary" onPress={onCalorieTarget} />
          <Button size="compact" label="Week overview" variant="secondary" onPress={onWeek} />
          <View style={styles.actions}>
            <Button size="compact" label="Close" variant="ghost" onPress={onClose} />
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
    gap: tokens.space.sm,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
});

export default DiaryOptionsSheet;
