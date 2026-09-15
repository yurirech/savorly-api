import { Pressable, StyleSheet, Text, View } from "react-native";
import { tokens } from "../theme/tokens";

type SourceCardProps = {
  title: string;
  subtitle: string;
  onPress: () => void;
};

export function SourceCard(props: SourceCardProps) {
  const { title, subtitle, onPress } = props;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.arrow}>→</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius,
    padding: tokens.space.lg,
    borderWidth: 1,
    borderColor: tokens.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 88,
  },
  pressed: {
    borderColor: tokens.accent,
  },
  title: {
    color: tokens.text,
    fontSize: tokens.type.title,
    fontWeight: "600",
  },
  subtitle: {
    color: tokens.muted,
    fontSize: tokens.type.caption,
    marginTop: 4,
  },
  arrow: {
    color: tokens.accent,
    fontSize: 24,
  },
});
