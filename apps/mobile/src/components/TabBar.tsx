import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, House, Notebook, Plus, Sparkle } from "phosphor-react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS = {
  index: House,
  recipes: BookOpen,
  diary: Notebook,
  save: Plus,
  create: Sparkle,
} as const;

function tabLabel(routeName: string): string {
  if (routeName === "index") return "Home";
  if (routeName === "recipes") return "Recipes";
  if (routeName === "diary") return "Diary";
  if (routeName === "save") return "Import";
  if (routeName === "create") return "Create";
  return routeName;
}

interface TabButtonProps {
  label: string;
  focused: boolean;
  icon: (typeof ICONS)[keyof typeof ICONS];
  onPress: () => void;
}

function TabButton(props: TabButtonProps) {
  const { label, focused, icon: Icon, onPress } = props;

  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <View style={[styles.iconWrap, focused && styles.raised]}>
        <Icon
          size={focused ? 26 : 24}
          color={focused ? tokens.bg : tokens.textMuted}
          weight={focused ? "fill" : "regular"}
        />
      </View>
      <AppText variant="caption" color={focused ? "accent" : "muted"} style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function TabBar(props: TabBarProps) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, tokens.space.sm) }]}>
      {state.routes.map((route, index) => {
        const href = (descriptors[route.key]?.options as { href?: string | null } | undefined)?.href;
        if (href === null) return null;
        const focused = state.index === index;
        const Icon = ICONS[route.name as keyof typeof ICONS] ?? House;
        return (
          <TabButton
            key={route.key}
            label={tabLabel(route.name)}
            focused={focused}
            icon={Icon}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: tokens.bgElevated,
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: tokens.space.sm,
    paddingHorizontal: tokens.space.sm,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  raised: {
    backgroundColor: tokens.accent,
    borderRadius: tokens.radius.full,
    ...tokens.shadow.card,
  },
  label: {
    fontFamily: tokens.font.bodyMedium,
  },
});
