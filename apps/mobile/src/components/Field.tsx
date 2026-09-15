import { StyleSheet, Text, TextInput, View } from "react-native";
import { tokens } from "../theme/tokens";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "default" | "email-address" | "url";
};

export function Field(props: FieldProps) {
  const { label, value, onChangeText, placeholder, multiline, secureTextEntry, autoCapitalize, keyboardType } = props;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.muted}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize ?? "sentences"}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.xs,
  },
  label: {
    color: tokens.muted,
    fontSize: tokens.type.caption,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: tokens.surface,
    color: tokens.text,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: 14,
    fontSize: tokens.type.body,
    minHeight: 52,
  },
  multiline: {
    minHeight: 160,
    textAlignVertical: "top",
  },
});
