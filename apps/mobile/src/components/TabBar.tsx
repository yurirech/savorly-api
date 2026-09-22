import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BookOpen, House, Jar, Plus, Sparkle } from "phosphor-react-native";
import { tokens } from "../theme/tokens";
import { AppText } from "./AppText";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

const ICONS = {
  index: House,
  recipes: BookOpen,
  pantry: Jar,
  save: Plus,
  create: Sparkle,
} as const;

function tabLabel(routeName: string): string {
  if (routeName === "index") return "Home";
  if (routeName === "recipes") return "Recipes";
  if (routeName === "pantry") return "Pantry";
  if (routeName === "save") return "Import";
  if (routeName === "create") return "Create";
  return routeName;
}

export function TabBar(props: TabBarProps) {
  const { state, navigation } = props;
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, tokens.space.sm) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const Icon = ICONS[route.name as keyof typeof ICONS] ?? House;
        const label = tabLabel(route.name);
        const raised = route.name === "save";
        const color = focused || raised ? tokens.accent : tokens.textMuted;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={styles.item}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <View style={[styles.iconWrap, raised && styles.raised, focused && raised && styles.raisedFocused]}>
              <Icon size={raised ? 26 : 24} color={raised ? tokens.bg : color} weight={focused || raised ? "fill" : "regular"} />
            </View>
            <AppText variant="caption" color={focused ? "accent" : "muted"} style={styles.label}>
              {label}
            </AppText>
          </Pressable>
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
    marginTop: -18,
    backgroundColor: tokens.accent,
    borderRadius: tokens.radius.full,
    ...tokens.shadow.card,
  },
  raisedFocused: {
    backgroundColor: tokens.accent,
  },
  label: {
    fontFamily: tokens.font.bodyMedium,
  },
});
