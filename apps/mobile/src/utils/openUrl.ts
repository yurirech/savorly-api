import { Linking } from "react-native";

export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const canOpen = await Linking.canOpenURL(trimmed);
  if (!canOpen) return;
  await Linking.openURL(trimmed);
}
