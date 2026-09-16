import { router } from "expo-router";
import { Globe, InstagramLogo, NotePencil } from "phosphor-react-native";
import { AppText } from "../../../src/components/AppText";
import { Screen } from "../../../src/components/Screen";
import { SourceCard } from "../../../src/components/SourceCard";
import { tokens } from "../../../src/theme/tokens";

export default function ImportHubScreen() {
  return (
    <Screen>
      <AppText variant="label" color="accent">
        Import
      </AppText>
      <AppText variant="display">Save a recipe that already exists</AppText>
      <AppText variant="body" color="muted">
        Caption and transcript only. No videos or webpage images are stored.
      </AppText>
      <SourceCard
        title="Instagram Reel"
        subtitle="Public Reel URL"
        icon={<InstagramLogo size={22} color={tokens.accent} weight="fill" />}
        onPress={() => router.push("/(app)/import/instagram")}
      />
      <SourceCard
        title="Recipe website"
        subtitle="JSON-LD first, then readable text"
        icon={<Globe size={22} color={tokens.accent} weight="regular" />}
        onPress={() => router.push("/(app)/import/website")}
      />
      <SourceCard
        title="Paste text"
        subtitle="Caption, notes, or a full recipe"
        icon={<NotePencil size={22} color={tokens.accent} weight="regular" />}
        onPress={() => router.push("/(app)/import/text")}
      />
    </Screen>
  );
}
