import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
  padded?: boolean;
  edges?: ("top" | "right" | "bottom" | "left")[];
}>;

export function Screen(props: ScreenProps) {
  const { children, scroll = true, padded = true, edges } = props;
  const bodyStyle = [styles.body, padded ? styles.padded : styles.flush];
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
        <View style={bodyStyle}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
      <ScrollView contentContainerStyle={bodyStyle} keyboardShouldPersistTaps="handled">
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
