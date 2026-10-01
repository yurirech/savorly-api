import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, ScrollView, StyleSheet, TextInput, View } from "react-native";
import type { GeneratedRecipe } from "@savorly/shared";
import { ApiRequestError, chatAboutRecipe, getRecipe } from "../../src/api/client";
import { AppText } from "../../src/components/AppText";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { setReviewDraft } from "../../src/store/reviewDraft";
import { tokens } from "../../src/theme/tokens";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export default function RecipeChatScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [title, setTitle] = useState("");
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

  async function send() {
    const message = input.trim();
    if (!id || !message || sending) return;
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
      setDraft(result.recipe);
      setMessages((current) => [...current, { role: "assistant", text: result.reply }]);
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
        <View style={styles.composer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about this recipe"
            placeholderTextColor={tokens.textMuted}
            accessibilityLabel="Ask about this recipe"
            editable={!sending}
            onFocus={scrollChatToEnd}
            style={styles.input}
          />
          <Button size="compact" label="Send" onPress={() => void send()} loading={sending} disabled={!input.trim()} />
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

const styles = StyleSheet.create({
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  input: {
    flex: 1,
    color: tokens.text,
    fontSize: tokens.type.body.fontSize,
    fontFamily: tokens.font.body,
    backgroundColor: tokens.surface,
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: tokens.radius.sm,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
    minHeight: 44,
  },
  userBubble: {
    alignSelf: "flex-end",
    maxWidth: "85%",
    backgroundColor: tokens.accentMuted,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    padding: tokens.space.sm,
  },
});
