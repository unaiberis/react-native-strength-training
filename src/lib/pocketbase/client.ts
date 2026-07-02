import PocketBase from 'pocketbase';
import { BaseAuthStore, RecordService } from 'pocketbase';
import type PocketBaseType from 'pocketbase';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PB_URL = process.env.EXPO_PUBLIC_POCKETBASE_URL ?? '';
const STORAGE_KEY = 'pb_auth';

/**
 * Expo-compatible auth store for PocketBase client.
 * Persists auth tokens in SecureStore on native, localStorage on web.
 */
class ExpoSecureStoreAuth extends BaseAuthStore {
  override save(token: string, record?: any): void {
    super.save(token, record);
    this._persist(token, record).catch(() => {
      // Best effort persistence
    });
  }

  override clear(): void {
    super.clear();
    this._removePersisted().catch(() => {
      // Best effort removal
    });
  }

  /**
   * Try to load persisted auth state from SecureStore.
   * Returns true if state was successfully restored.
   */
  async loadFromStore(): Promise<boolean> {
    try {
      let data: string | null = null;
      if (Platform.OS === 'web') {
        data = localStorage.getItem(STORAGE_KEY);
      } else {
        data = await SecureStore.getItemAsync(STORAGE_KEY);
      }
      if (data) {
        const parsed = JSON.parse(data);
        super.save(parsed.token || '', parsed.record || null);
        return true;
      }
    } catch {
      // Storage read failed — no persisted state
    }
    return false;
  }

  private async _persist(token: string, record?: any): Promise<void> {
    const data = JSON.stringify({ token, record: record ?? null });
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, data);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, data);
    }
  }

  private async _removePersisted(): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  }
}

/**
 * Mock PocketBase client for when EXPO_PUBLIC_POCKETBASE_URL is not configured.
 * Allows UI development without a running backend.
 */
function createMockClient(): PocketBaseType {
  console.warn(
    '[PocketBase] EXPO_PUBLIC_POCKETBASE_URL no configurada. Usando mock — las funciones de auth/DB devolverán datos vacíos.'
  );

  const tick = () => new Promise((r) => setTimeout(r, 100));

  const mockAuthStore = new BaseAuthStore();

  function createMockRecordService(): RecordService {
    return {
      authWithPassword: async () => {
        await tick();
        return { record: null, token: '' };
      },
      authRefresh: async () => {
        await tick();
        return { record: null, token: '' };
      },
      create: async () => {
        await tick();
        return null;
      },
      getList: async () => {
        await tick();
        return {
          page: 1,
          perPage: 30,
          totalItems: 0,
          totalPages: 0,
          items: [],
        };
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
        password: { enabled: true, identityFields: ['email'] },
        oauth2: { enabled: false, providers: [] },
        mfa: { enabled: false },
        otp: { enabled: false },
      }),
      requestPasswordReset: async () => true,
      requestVerification: async () => true,
    } as unknown as RecordService;
  }

  return {
    baseURL: '',
    authStore: mockAuthStore,
    collection: () => createMockRecordService(),
    filter: (raw: string) => raw,
    buildURL: (path: string) => path,
    send: async () => null,
    beforeSend: undefined,
    afterSend: undefined,
    lang: 'en-US',
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
 * Otherwise, returns a real PocketBase client connected to the configured URL
 * with Expo SecureStore-based auth persistence.
 */
function createPocketBaseClient(): PocketBaseType {
  if (!PB_URL) {
    return createMockClient();
  }

  const authStore = new ExpoSecureStoreAuth();
  const pb = new PocketBase(PB_URL, authStore);

  // Disable auto-cancellation to prevent "request was aborted" errors
  // when React Query re-fetches queries from the offline persister.
  pb.autoCancellation(false);

  return pb;
}

export const pb = createPocketBaseClient();
export { ExpoSecureStoreAuth };
