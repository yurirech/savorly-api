import { useThemedStyles, type ThemeColors } from "../theme/theme";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { DiaryMealGroup } from "@savorly/shared";
import { AppText } from "../components/AppText";
import { Button } from "../components/Button";
import { tokens } from "../theme/tokens";

interface DiaryMealPickerSheetProps {
  visible: boolean;
  meals: DiaryMealGroup[];
  title?: string;
  onClose: () => void;
  onSelectMeal: (mealId: string) => void;
  onCreateMeal: () => void;
}

function DiaryMealPickerSheet(props: DiaryMealPickerSheetProps) {
  const styles = useThemedStyles(createStyles);

  const { visible, meals, title = "Log in which meal?", onClose, onSelectMeal, onCreateMeal } = props;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close">
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <AppText variant="title">{title}</AppText>
          {meals.length === 0 ? (
            <AppText variant="body" color="muted">
              Add a meal group on today&apos;s diary first.
            </AppText>
          ) : null}
          {meals.map((meal) => (
            <Button size="compact" key={meal.id} label={meal.name} variant="secondary" onPress={() => onSelectMeal(meal.id)} />
          ))}
          <View style={styles.actions}>
          <Button size="compact" label="New meal group" variant="ghost" onPress={onCreateMeal} />
          <Button size="compact" label="Cancel" variant="ghost" onPress={onClose} />
          </View>
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
    gap: tokens.space.sm,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
  },
});
}


export default DiaryMealPickerSheet;
