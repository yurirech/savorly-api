import type { PropsWithChildren } from "react";
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
}>;

export function Screen(props: ScreenProps) {
  const { children, scroll = true, padded = true, safeBottom = true, edges, onRefresh, refreshing = false } = props;
  const insets = useSafeAreaInsets();
  const bottomInset = safeBottom ? insets.bottom : 0;
  const bodyStyle = [
    styles.body,
    padded ? styles.padded : styles.flush,
    { paddingBottom: (padded ? tokens.space.lg : 0) + bottomInset },
  ];
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
        <View style={bodyStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
      <ScrollView
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg,
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
});
