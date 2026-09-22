import { Tabs } from "expo-router";
import { TabBar } from "../../../src/components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="recipes" options={{ title: "Recipes" }} />
      <Tabs.Screen name="pantry" options={{ title: "Pantry" }} />
      <Tabs.Screen name="save" options={{ title: "Import" }} />
      <Tabs.Screen name="create" options={{ title: "Create" }} />
    </Tabs>
  );
}
