import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { tokens } from "../theme/tokens";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen(props: ScreenProps) {
  const { children, scroll = true } = props;
  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  body: {
    flexGrow: 1,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
});
