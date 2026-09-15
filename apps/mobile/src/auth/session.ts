import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { AuthResponse, AuthUser } from "@savorly/shared";

const TOKEN_KEY = "savorly.token";
const USER_KEY = "savorly.user";

export async function saveSession(response: AuthResponse): Promise<void> {
  await setItem(TOKEN_KEY, response.token);
  await setItem(USER_KEY, JSON.stringify(response.user));
}

export async function clearSession(): Promise<void> {
  await deleteItem(TOKEN_KEY);
  await deleteItem(USER_KEY);
}

export async function getToken(): Promise<string | null> {
  return getItem(TOKEN_KEY);
}

export async function getUser(): Promise<AuthUser | null> {
  const raw = await getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
