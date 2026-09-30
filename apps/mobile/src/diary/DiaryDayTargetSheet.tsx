import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { Field } from "../components/Field";
import { tokens } from "../theme/tokens";

interface DiaryDayTargetSheetProps {
  visible: boolean;
  date: string;
  currentKcal: number | null;
  canClear: boolean;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (kcal: number) => void;
  onClear: () => void;
}

function DiaryDayTargetSheet(props: DiaryDayTargetSheetProps) {
  const { visible, date, currentKcal, canClear, saving, error, onClose, onSave, onClear } = props;
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (visible) {
      setDraft(currentKcal != null ? String(currentKcal) : "");
    }
  }, [visible, currentKcal]);

  const kcal = Number(draft);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">Calorie target</AppText>
          <AppText variant="body" color="muted">
            {date}. This day only. Protein, carbs, and fat stay on your profile.
          </AppText>
          {currentKcal == null ? (
            <AppText variant="body" color="muted">
              Set your targets first, then you can change calories for this day.
            </AppText>
          ) : (
            <Field label="Calories" value={draft} onChangeText={setDraft} keyboardType="numeric" />
          )}
          {error ? (
            <AppText variant="body" color="danger">
              {error}
            </AppText>
          ) : null}
          <View style={styles.actions}>
            {currentKcal != null ? (
              <Button
                size="compact"
                label="Save"
                onPress={() => onSave(kcal)}
                loading={saving}
                disabled={!Number.isInteger(kcal) || kcal < 1 || kcal > 20000}
              />
            ) : null}
            {canClear ? (
              <Button size="compact" label="Use calculated" variant="secondary" onPress={onClear} loading={saving} />
            ) : null}
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
    gap: tokens.space.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});

export default DiaryDayTargetSheet;
