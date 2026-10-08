import type { PropsWithChildren, ReactNode, RefObject } from "react";
import {
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
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
  header?: ReactNode;
  overlay?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}>;

export function Screen(props: ScreenProps) {
  const {
    children,
    scroll = true,
    padded = true,
    safeBottom = true,
    edges,
    onRefresh,
    refreshing = false,
    footer,
    header,
    overlay,
    scrollRef,
    onScroll,
  } = props;
  const insets = useSafeAreaInsets();
  const bottomInset = safeBottom && !footer ? insets.bottom : 0;
  const bodyStyle = [
    styles.body,
    padded ? [styles.padded, header ? styles.paddedAfterHeader : null] : styles.flush,
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
  const scrollNode = scroll ? (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={bodyStyle}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={!footer}
      onScroll={onScroll}
      scrollEventThrottle={onScroll ? 16 : undefined}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={tokens.accent} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={bodyStyle}>{children}</View>
  );

  const headerNode = header ? (
    <View style={[styles.header, padded && styles.headerPadded]}>{header}</View>
  ) : null;

  const overlayNode = overlay ? (
    <View style={styles.overlay} pointerEvents="box-none">
      {overlay}
    </View>
  ) : null;

  const layout = (
    <>
      {headerNode}
      {scrollNode}
      {footerNode}
      {overlayNode}
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={edges ?? ["top", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {layout}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: tokens.bg,
  },
  flex: {
    flex: 1,
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
  paddedAfterHeader: {
    paddingTop: tokens.space.sm,
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
  header: {
    gap: tokens.space.sm,
    backgroundColor: tokens.bg,
    paddingBottom: tokens.space.sm,
  },
  headerPadded: {
    paddingHorizontal: tokens.space.lg,
    paddingTop: tokens.space.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
