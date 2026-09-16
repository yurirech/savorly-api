import { Pressable, StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader(props: SectionHeaderProps) {
  const { title, actionLabel, onAction } = props;
  return (
    <View style={styles.row}>
      <AppText variant="title">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="body" color="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
