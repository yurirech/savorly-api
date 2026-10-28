import { Linking } from "react-native";

export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const isWeb = /^https?:\/\//i.test(trimmed);
  if (!isWeb) {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (!canOpen) return;
  }
  await Linking.openURL(trimmed);
}
