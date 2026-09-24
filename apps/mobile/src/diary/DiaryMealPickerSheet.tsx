import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { DiaryMealGroup } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";

interface DiaryMealPickerSheetProps {
  visible: boolean;
  meals: DiaryMealGroup[];
  onClose: () => void;
  onSelectMeal: (mealId: string) => void;
  onCreateMeal: () => void;
}

function DiaryMealPickerSheet(props: DiaryMealPickerSheetProps) {
  const { visible, meals, onClose, onSelectMeal, onCreateMeal } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">Log in which meal?</AppText>
          {meals.length === 0 ? (
            <AppText variant="body" color="muted">
              Add a meal group on today&apos;s diary first.
            </AppText>
          ) : null}
          {meals.map((meal) => (
            <Button key={meal.id} label={meal.name} variant="secondary" onPress={() => onSelectMeal(meal.id)} />
          ))}
          <Button label="New meal group" variant="ghost" onPress={onCreateMeal} />
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
    gap: tokens.space.sm,
  },
});

export default DiaryMealPickerSheet;
