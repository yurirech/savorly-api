import { type Href, router, useFocusEffect } from "expo-router";
import { CheckCircle, CircleDashed, Jar, PencilSimple } from "phosphor-react-native";
import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import type { PantryResponse, PantryStarterView, UserPantryItem } from "@savorly/shared";
import {
  ApiRequestError,
  createPantryItem,
  deletePantryItem,
  fetchPantry,
  setStarterInPantry,
  updatePantryItem,
} from "../../../src/api/client";
import { AppText } from "../../../src/components/AppText";
import { Button } from "../../../src/components/Button";
import { Field } from "../../../src/components/Field";
import { Screen } from "../../../src/components/Screen";
import { tokens } from "../../../src/theme/tokens";

function parseAliasInput(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatAliasInput(aliases: string[]): string {
  return aliases.filter(Boolean).join(", ");
}

function aliasCaption(displayName: string, aliases: string[]): string[] {
  const normalizedName = displayName.trim().toLowerCase();
  return aliases.filter((alias) => alias.trim().toLowerCase() !== normalizedName);
}

type PantryListRow =
  | { kind: "starter"; starter: PantryStarterView }
  | { kind: "custom"; item: UserPantryItem };

function pantryListRows(pantry: PantryResponse): PantryListRow[] {
  const starters: PantryListRow[] = pantry.starters.map((starter) => ({ kind: "starter", starter }));
  const custom: PantryListRow[] = [...pantry.items]
    .sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: "base" }))
    .map((item) => ({ kind: "custom", item }));
  return [...starters, ...custom];
}

export default function PantryScreen() {
  const [pantry, setPantry] = useState<PantryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAliases, setNewAliases] = useState("");
  const [adding, setAdding] = useState(false);
  const [editItem, setEditItem] = useState<UserPantryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAliases, setEditAliases] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const listRows = useMemo(() => (pantry ? pantryListRows(pantry) : []), [pantry]);

  const loadPantry = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchPantry();
      setPantry(data);
    } catch (err) {
      if (err instanceof ApiRequestError && err.code === "unauthorized") {
        router.replace("/(auth)/login" as Href);
        return;
      }
      setError(err instanceof ApiRequestError ? err.message : "Could not load your pantry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPantry();
    }, [loadPantry]),
  );

  async function toggleStarter(starterKey: string, nextInPantry: boolean) {
    if (!pantry) {
      return;
    }
    const snapshot = pantry;
    setPantry({
      ...pantry,
      starters: pantry.starters.map((starter) =>
        starter.key === starterKey ? { ...starter, inPantry: nextInPantry } : starter,
      ),
    });
    try {
      const updated = await setStarterInPantry(starterKey, nextInPantry);
      setPantry(updated);
    } catch (err) {
      setPantry(snapshot);
      setError(err instanceof ApiRequestError ? err.message : "Could not update staple.");
    }
  }

  async function submitNewItem() {
    const name = newName.trim();
    if (!name) {
      return;
    }
    setAdding(true);
    setError(null);
    try {
      await createPantryItem(name, parseAliasInput(newAliases));
      setNewName("");
      setNewAliases("");
      await loadPantry(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not add staple.");
    } finally {
      setAdding(false);
    }
  }

  function openEdit(item: UserPantryItem) {
    setEditItem(item);
    setEditName(item.displayName);
    setEditAliases(formatAliasInput(item.aliases.filter((alias) => alias !== item.displayName)));
  }

  function closeEdit() {
    setEditItem(null);
    setEditName("");
    setEditAliases("");
  }

  async function saveEdit() {
    if (!editItem) {
      return;
    }
    const name = editName.trim();
    if (!name) {
      return;
    }
    setSavingEdit(true);
    setError(null);
    try {
      await updatePantryItem(editItem.id, name, parseAliasInput(editAliases));
      closeEdit();
      await loadPantry(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not save staple.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeItem(item: UserPantryItem) {
    setError(null);
    try {
      await deletePantryItem(item.id);
      await loadPantry(true);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not remove staple.");
    }
  }

  return (
    <Screen onRefresh={() => loadPantry(true)} refreshing={refreshing}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Jar size={28} color={tokens.accent} weight="fill" />
          <AppText variant="title">My pantry</AppText>
        </View>
        <AppText variant="body" color="muted">
          What you keep at home — no amounts yet.
        </AppText>
      </View>

      {error ? (
        <AppText variant="body" color="danger">
          {error}
        </AppText>
      ) : null}

      {loading && !pantry ? (
        <AppText variant="body" color="muted">
          Loading pantry…
        </AppText>
      ) : null}

      {pantry ? (
        <>
          <AppText variant="label" color="muted">
            Staples
          </AppText>
          <View style={styles.card}>
            {listRows.map((row) => {
              if (row.kind === "starter") {
                const { starter } = row;
                const starterAliases = aliasCaption(starter.defaultName, starter.defaultAliases);
                return (
                  <Pressable
                    key={`starter-${starter.key}`}
                    onPress={() => void toggleStarter(starter.key, !starter.inPantry)}
                    style={styles.listRow}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: starter.inPantry }}
                    accessibilityLabel={starter.defaultName}
                  >
                    {starter.inPantry ? (
                      <CheckCircle size={22} color={tokens.accent} weight="fill" />
                    ) : (
                      <CircleDashed size={22} color={tokens.textMuted} weight="regular" />
                    )}
                    <View style={styles.rowMain}>
                      <AppText variant="body">{starter.defaultName}</AppText>
                      {starterAliases.length > 0 ? (
                        <AppText variant="caption" color="muted" numberOfLines={2}>
                          {starterAliases.join(" · ")}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                );
              }

              const { item } = row;
              const extraAliases = aliasCaption(item.displayName, item.aliases);
              return (
                <View key={`custom-${item.id}`} style={styles.listRow}>
                  <Pressable
                    onPress={() => void removeItem(item)}
                    hitSlop={8}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: true }}
                    accessibilityLabel={`Remove ${item.displayName} from pantry`}
                  >
                    <CheckCircle size={22} color={tokens.accent} weight="fill" />
                  </Pressable>
                  <View style={styles.rowMain}>
                    <AppText variant="body">{item.displayName}</AppText>
                    {extraAliases.length > 0 ? (
                      <AppText variant="caption" color="muted" numberOfLines={2}>
                        {extraAliases.join(" · ")}
                      </AppText>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => openEdit(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${item.displayName}`}
                  >
                    <PencilSimple size={18} color={tokens.textMuted} />
                  </Pressable>
                </View>
              );
            })}
          </View>

          <AppText variant="label" color="muted">
            Add staple
          </AppText>
          <Field label="Name" value={newName} onChangeText={setNewName} placeholder="Chickpeas" />
          <Field
            label="Aliases"
            value={newAliases}
            onChangeText={setNewAliases}
            placeholder="ceci, grão de bico"
            multiline
          />
          <Button label="Add to pantry" onPress={() => void submitNewItem()} loading={adding} disabled={!newName.trim()} />
        </>
      ) : null}

      <Modal visible={editItem != null} animationType="slide" transparent onRequestClose={closeEdit}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText variant="title">Edit staple</AppText>
            <Field label="Name" value={editName} onChangeText={setEditName} />
            <Field
              label="Aliases"
              value={editAliases}
              onChangeText={setEditAliases}
              placeholder="Other names, comma separated"
              multiline
            />
            <Button label="Save" onPress={() => void saveEdit()} loading={savingEdit} disabled={!editName.trim()} />
            <Button label="Cancel" variant="ghost" onPress={closeEdit} disabled={savingEdit} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: tokens.space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
  },
  card: {
    backgroundColor: tokens.surface,
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: tokens.border,
    padding: tokens.space.sm,
    gap: tokens.space.xs,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.space.sm,
    paddingVertical: tokens.space.sm,
    paddingHorizontal: tokens.space.xs,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: tokens.bgElevated,
    borderTopLeftRadius: tokens.radius.lg,
    borderTopRightRadius: tokens.radius.lg,
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
});
