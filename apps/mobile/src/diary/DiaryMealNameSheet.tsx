import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { DIARY_MEAL_NAME_SUGGESTIONS } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { tokens } from "../theme/tokens";

interface DiaryMealNameSheetProps {
  visible: boolean;
  title: string;
  initialName?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (name: string) => void | Promise<void>;
  loading?: boolean;
}

function DiaryMealNameSheet(props: DiaryMealNameSheetProps) {
  const { visible, title, initialName = "", confirmLabel, onClose, onConfirm, loading } = props;
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (visible) {
      setName(initialName);
    }
  }, [initialName, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">{title}</AppText>
          <Field label="Meal name" value={name} onChangeText={setName} placeholder="Breakfast" />
          <View style={styles.chips}>
            {DIARY_MEAL_NAME_SUGGESTIONS.map((suggestion) => (
              <Pressable
                key={suggestion}
                onPress={() => setName(suggestion)}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={suggestion}
              >
                <AppText variant="caption">{suggestion}</AppText>
              </Pressable>
            ))}
          </View>
          <Button label={confirmLabel} onPress={() => void onConfirm(name.trim())} loading={loading} />
          <Button label="Cancel" variant="ghost" onPress={onClose} />
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
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.xs,
  },
});

export default DiaryMealNameSheet;
