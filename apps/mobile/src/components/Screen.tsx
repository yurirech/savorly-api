import type { PropsWithChildren, ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  safeBottom?: boolean;
  edges?: ("top" | "right" | "bottom" | "left")[];
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
  footer?: ReactNode;
}>;

export function Screen(props: ScreenProps) {
  const { children, scroll = true, padded = true, safeBottom = true, edges, onRefresh, refreshing = false, footer } = props;
  const insets = useSafeAreaInsets();
  const bottomInset = safeBottom && !footer ? insets.bottom : 0;
  const bodyStyle = [
    styles.body,
    padded ? styles.padded : styles.flush,
    { paddingBottom: (padded ? tokens.space.lg : 0) + bottomInset },
  ];
  const footerNode = footer ? (
    <View
      style={[
        styles.footer,
        padded && styles.footerPadded,
        { paddingBottom: tokens.space.sm + (safeBottom ? insets.bottom : 0) },
      ]}
    >
      {footer}
    </View>
  ) : null;
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
        <View style={bodyStyle}>{children}</View>
        {footerNode}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={bodyStyle}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {footerNode}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flexGrow: 1,
  },
  padded: {
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  flush: {
    padding: 0,
    gap: 0,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.space.sm,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    backgroundColor: tokens.bg,
    paddingTop: tokens.space.sm,
  },
  footerPadded: {
    paddingHorizontal: tokens.space.lg,
  },
});
