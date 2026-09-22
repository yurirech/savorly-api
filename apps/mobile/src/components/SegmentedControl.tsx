import { Pressable, StyleSheet, View } from "react-native";
import { tokens } from "../theme/tokens";
import { softWrapSegmentLabel } from "../utils/textWrap";
import { AppText } from "./AppText";

type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
};

export function SegmentedControl<T extends string>(props: SegmentedControlProps<T>) {
  const { value, options, onChange, disabled } = props;
  return (
    <View style={[styles.track, disabled && styles.disabled]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            style={[styles.pill, selected && styles.selected]}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled }}
            accessibilityLabel={option.label}
          >
            <AppText variant="caption" style={[styles.segmentLabel, selected ? styles.selectedLabel : styles.label]}>
              {softWrapSegmentLabel(option.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    backgroundColor: tokens.bgElevated,
    borderRadius: tokens.radius.full,
    padding: tokens.space.xs,
    gap: tokens.space.xs,
  },
  pill: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: 40,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  selected: {
    backgroundColor: tokens.accent,
  },
  segmentLabel: {
    width: "100%",
    textAlign: "center",
    fontFamily: tokens.font.bodyBold,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    color: tokens.textMuted,
  },
  selectedLabel: {
    color: tokens.bg,
  },
  disabled: {
    opacity: 0.45,
  },
});
