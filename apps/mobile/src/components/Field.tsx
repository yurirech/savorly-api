import { StyleSheet, TextInput, View } from "react-native";
import { MagnifyingGlass } from "phosphor-react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences";
  keyboardType?: "default" | "email-address" | "url";
  variant?: "default" | "search";
  editable?: boolean;
};

export function Field(props: FieldProps) {
  const {
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
    secureTextEntry,
    autoCapitalize,
    keyboardType,
    variant = "default",
    editable = true,
  } = props;
  const isSearch = variant === "search";
  return (
    <View style={styles.wrap}>
      {!isSearch ? <AppText variant="label" color="muted">{label}</AppText> : null}
      <View style={[styles.inputWrap, isSearch && styles.searchWrap]}>
        {isSearch ? <MagnifyingGlass size={18} color={tokens.textMuted} weight="regular" /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder ?? (isSearch ? label : undefined)}
          placeholderTextColor={tokens.textMuted}
          multiline={multiline}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize ?? (isSearch ? "none" : "sentences")}
          keyboardType={keyboardType}
          editable={editable}
          accessibilityLabel={label}
          style={[styles.input, isSearch && styles.searchInput, multiline && styles.multiline]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: tokens.space.sm,
  },
  inputWrap: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    paddingHorizontal: tokens.space.md,
    minHeight: 52,
    justifyContent: "center",
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.bgElevated,
  },
  input: {
    color: tokens.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    paddingVertical: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
  },
  multiline: {
    minHeight: 160,
    textAlignVertical: "top",
  },
});
