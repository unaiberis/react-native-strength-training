import PocketBase from "pocketbase";
import { BaseAuthStore, LocalAuthStore, RecordService } from "pocketbase";
import type PocketBaseType from "pocketbase";
import { Platform } from "react-native";

const PB_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? "";
const STORAGE_KEY = "pb_auth";

/**
 * Create the appropriate auth store for the current platform.
 *
 * - Web: LocalAuthStore — auto-persists to localStorage, auto-restores,
 *   cross-tab sync via storage events. No manual loadFromStore() needed.
 * - Native: AsyncAuthStore with expo-secure-store — async persistence,
 *   auto-restores via the `initial` param.
 */
function createAuthStore() {
  if (Platform.OS === "web") {
    return new LocalAuthStore(STORAGE_KEY);
  }

  // Native: use expo-secure-store via AsyncAuthStore
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SecureStore = require("expo-secure-store");
  return {
    save: async (serialized: string) => {
      await SecureStore.setItemAsync(STORAGE_KEY, serialized);
    },
    clear: async () => {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    },
    initial: SecureStore.getItemAsync(STORAGE_KEY),
  };
}

/**
 * Mock PocketBase client for when EXPO_PUBLIC_POCKETBASE_URL is not configured.
 * Allows UI development without a running backend.
 */
function createMockClient(): PocketBaseType {
  console.warn(
    "[PocketBase] EXPO_PUBLIC_POCKETBASE_URL no configurada. Usando mock — las funciones de auth/DB devolverán datos vacíos.",
  );

  const tick = () => new Promise((r) => setTimeout(r, 100));

  const mockAuthStore = new BaseAuthStore();

  function createMockRecordService(): RecordService {
    return {
      authWithPassword: async () => {
        await tick();
        return { record: null, token: "" };
      },
      authRefresh: async () => {
        await tick();
        return { record: null, token: "" };
      },
      create: async () => {
        await tick();
        return null;
      },
      getList: async () => {
        await tick();
        return { page: 1, perPage: 30, totalItems: 0, totalPages: 0, items: [] };
      },
      getOne: async () => {
        await tick();
        return null;
      },
      getFirstListItem: async () => {
        await tick();
        throw new Error("The requested resource wasn't found.");
      },
      update: async () => {
        await tick();
        return null;
      },
      delete: async () => {
        await tick();
        return true;
      },
      getFullList: async () => {
        await tick();
        return [];
      },
      subscribe: async () => () => {},
      unsubscribe: async () => {},
      listAuthMethods: async () => ({
        password: { enabled: true, identityFields: ["email"] },
        oauth2: { enabled: false, providers: [] },
        mfa: { enabled: false },
        otp: { enabled: false },
      }),
      requestPasswordReset: async () => true,
      requestVerification: async () => true,
    } as unknown as RecordService;
  }

  return {
    baseURL: "",
    authStore: mockAuthStore,
    collection: () => createMockRecordService(),
    filter: (raw: string) => raw,
    buildURL: (path: string) => path,
    send: async () => null,
    beforeSend: undefined,
    afterSend: undefined,
    lang: "en-US",
    settings: {} as any,
    collections: {} as any,
    files: {} as any,
    logs: {} as any,
    realtime: {} as any,
    health: {} as any,
    backups: {} as any,
    crons: {} as any,
    sql: {} as any,
    autoCancellation: () => ({}) as any,
    cancelRequest: () => ({}) as any,
    cancelAllRequests: () => ({}) as any,
    createBatch: () => ({}) as any,
  } as unknown as PocketBaseType;
}

/**
 * Create a PocketBase client.
 *
 * If EXPO_PUBLIC_POCKETBASE_URL is not configured, returns a mock client.
 * Otherwise, returns a real PocketBase client with platform-appropriate
 * auth persistence (LocalAuthStore for web, AsyncAuthStore for native).
 */
function createPocketBaseClient(): PocketBaseType {
  if (!PB_URL) {
    return createMockClient();
  }

  const authStore = createAuthStore();
  return new PocketBase(PB_URL, authStore as any);
}

export const pb = createPocketBaseClient();
