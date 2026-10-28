import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { listRecipeChanges, type GeneratedRecipe } from "@savorly/shared";
import { ApiRequestError, chatAboutRecipe, getRecipe } from "../../src/api/client";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { setReviewDraft } from "../../src/store/reviewDraft";
import { tokens } from "../../src/theme/tokens";
import { useTheme, useThemedStyles, type ThemeColors } from "../../src/theme/theme";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  changes?: string[];
};

const CHAT_PRESETS = [
  { label: "Make it healthier", prompt: "Make it healthier" },
  { label: "Translate to English", prompt: "Translate to English" },
  { label: "Convert to cups or grams", prompt: "Convert to cups or grams" },
] as const;

export default function RecipeChatScreen() {
  const colors = useTheme();
  const styles = useThemedStyles(createStyles);

  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [title, setTitle] = useState("");
  const [saved, setSaved] = useState<GeneratedRecipe | null>(null);
  const [draft, setDraft] = useState<GeneratedRecipe | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollChatToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  useEffect(() => {
    scrollChatToEnd();
  }, [messages, scrollChatToEnd]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", scrollChatToEnd);
    return () => {
      showSub.remove();
    };
  }, [scrollChatToEnd]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const live = await getRecipe(id);
      setTitle(live.recipe.title);
      setSaved(live.recipe);
      setReady(true);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not open this recipe.");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function send(raw: string) {
    const message = raw.trim();
    if (!id || !message || sending) return;
    const baseline = draft ?? saved;
    const history = messages.slice(-8).map((turn) => ({ role: turn.role, text: turn.text.slice(0, 500) }));
    setInput("");
    setMessages((current) => [...current, { role: "user", text: message }]);
    setSending(true);
    setError(null);
    try {
      const result = await chatAboutRecipe(id, {
        message,
        recipe: draft ?? undefined,
        history,
      });
      const changes =
        result.changes?.length > 0
          ? result.changes
          : baseline
            ? listRecipeChanges(baseline, result.recipe)
            : [];
      setDraft(result.recipe);
      setMessages((current) => [...current, { role: "assistant", text: result.reply, changes }]);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Changing this recipe needs a connection.");
    } finally {
      setSending(false);
    }
  }

  function keep() {
    if (!id || !draft) return;
    setReviewDraft(draft, id, `/(app)/recipe/${id}`);
    router.push("/(app)/review");
  }

  return (
    <Screen
      scrollRef={scrollRef}
      onRefresh={() => void load()}
      footer={
        <View style={styles.footer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
            keyboardShouldPersistTaps="handled"
          >
            {CHAT_PRESETS.map((preset) => (
              <Pressable
                key={preset.label}
                onPress={() => void send(preset.prompt)}
                disabled={sending}
                style={styles.chip}
                accessibilityRole="button"
                accessibilityLabel={preset.label}
              >
                <AppText variant="caption">{preset.label}</AppText>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.composer}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask about this recipe"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Ask about this recipe"
              editable={!sending}
              onFocus={scrollChatToEnd}
              style={styles.input}
            />
            <Button
              size="compact"
              label="Send"
              onPress={() => void send(input)}
              loading={sending}
              disabled={!input.trim()}
            />
          </View>
        </View>
      }
    >
      <AppText variant="title">{title || "This recipe"}</AppText>
      <AppText variant="body" color="muted">
        Changes stay on this recipe and will not create a new one.
      </AppText>
      {draft ? <Button size="compact" label="Keep this version" onPress={keep} /> : null}
      {messages.map((message, index) => (
        <View key={`${message.role}-${index}`} style={message.role === "user" ? styles.userBubble : styles.assistantBubble}>
          <AppText variant="body">{message.text}</AppText>
          {message.role === "assistant" && message.changes && message.changes.length > 0 ? (
            <View style={styles.changes}>
              <AppText variant="label" color="muted">
                Changes
              </AppText>
              {message.changes.map((line) => (
                <AppText key={line} variant="caption">
                  {line}
                </AppText>
              ))}
            </View>
          ) : null}
        </View>
      ))}
      {!ready && messages.length === 0 && !error ? (
        <AppText variant="body" color="muted">
          Loading this recipe…
        </AppText>
      ) : null}
      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  footer: {
    gap: tokens.space.sm,
  },
  chips: {
    gap: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  chip: {
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: tokens.space.md,
    paddingVertical: tokens.space.sm,
    backgroundColor: colors.surface,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    minHeight: 44,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: colors.accentMuted,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    backgroundColor: colors.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
    gap: tokens.space.sm,
  },
  changes: {
    gap: tokens.space.xs,
  },
});
}

