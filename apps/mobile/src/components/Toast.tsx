import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type ToastProps = {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onHide: () => void;
  offset?: number;
};

function Toast(props: ToastProps) {
  const { visible, message, actionLabel, onAction, onHide, offset = 0 } = props;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!visible) return;
    const handle = setTimeout(onHide, 4000);
    return () => clearTimeout(handle);
  }, [visible, message, onHide]);

  if (!visible) return null;

  return (
    <View
      style={[styles.toast, { bottom: tokens.space.md + insets.bottom + offset }]}
      accessibilityLiveRegion="polite"
    >
      <AppText variant="body" style={styles.message} numberOfLines={2}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          hitSlop={8}
        >
          <AppText variant="label" color="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: tokens.space.lg,
    right: tokens.space.lg,
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.space.md,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.bgElevated,
    borderWidth: 1,
    borderColor: tokens.border,
    ...tokens.shadow.card,
  },
  message: {
    flex: 1,
    minWidth: 0,
  },
});

export default Toast;
