import { useTheme } from "../src/theme/theme";
import { Redirect, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { getToken } from "../src/auth/session";

export default function Index() {
  const colors = useTheme();

  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    void getToken().then(setToken);
  }, []);

  if (token === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return <Redirect href={(token ? "/(app)" : "/(auth)/login") as Href} />;
}
