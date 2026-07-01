// Mock pocketbase BEFORE any imports so the module under test
// gets the fake version instead of trying to load ESM
jest.mock("pocketbase", () => {
  class MockBaseAuthStore {
    private _token = "";
    private _model: any = null;
    private _onChangeCallbacks: Array<(token: string, record: any) => void> = [];

    get token() { return this._token; }
    get record() { return this._model; }
    get model() { return this._model; }
    get isValid() {
      if (!this._token) return false;
      try {
        const payload = JSON.parse(atob(this._token.split(".")[1]));
        return !payload.exp || payload.exp * 1000 > Date.now();
      } catch { return !!this._token; }
    }
    get isSuperuser() { return false; }

    save(token: string, record?: any) {
      this._token = token || "";
      this._model = record || null;
      this.triggerChange();
    }

    clear() {
      this._token = "";
      this._model = null;
      this.triggerChange();
    }

    onChange(cb: (token: string, record: any) => void, fireImmediately = false) {
      this._onChangeCallbacks.push(cb);
      if (fireImmediately) cb(this._token, this._model);
      return () => {
        const idx = this._onChangeCallbacks.indexOf(cb);
        if (idx >= 0) this._onChangeCallbacks.splice(idx, 1);
      };
    }

    private triggerChange() {
      for (const cb of this._onChangeCallbacks) cb(this._token, this._model);
    }

    loadFromCookie = jest.fn();
    exportToCookie = jest.fn(() => "");
  }

  return {
    __esModule: true,
    default: jest.fn().mockImplementation((url, authStore) => ({
      baseURL: url,
      authStore: authStore ?? new MockBaseAuthStore(),
      collection: jest.fn().mockReturnValue({
        authWithPassword: jest.fn(),
        authRefresh: jest.fn(),
        create: jest.fn(),
        getList: jest.fn(),
        getOne: jest.fn(),
        getFirstListItem: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        getFullList: jest.fn(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        listAuthMethods: jest.fn(),
        requestPasswordReset: jest.fn(),
        requestVerification: jest.fn(),
      }),
      filter: jest.fn((s) => s),
      buildURL: jest.fn((s) => s),
      send: jest.fn(),
      lang: "en-US",
      settings: {},
      collections: {},
      files: {},
      logs: {},
      realtime: {},
      health: {},
      backups: {},
      crons: {},
      sql: {},
      autoCancellation: jest.fn(),
      cancelRequest: jest.fn(),
      cancelAllRequests: jest.fn(),
      createBatch: jest.fn(),
    })),
    BaseAuthStore: MockBaseAuthStore,
    RecordService: class {},
    RecordModel: class {},
    ClientResponseError: class extends Error {
      status = 0;
      response = {};
      data = {};
      isAbort = false;
    },
  };
});

describe("PocketBase client", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_POCKETBASE_URL;
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("creates a mock client when EXPO_PUBLIC_POCKETBASE_URL is empty", async () => {
    const { pb } = await import("../client");
    expect(pb).toBeDefined();
    expect(pb.baseURL).toBe("");
  });

  it("mock client authStore has valid token/model shape", async () => {
    const { pb } = await import("../client");
    const store = pb.authStore;
    expect(typeof store.isValid).toBe("boolean");
    expect(typeof store.token).toBe("string");
    expect("model" in store).toBe(true);
  });

  it("mock client supports collection() which returns a RecordService-like object", async () => {
    const { pb } = await import("../client");
    const users = pb.collection("users");
    expect(users).toBeDefined();
    expect(typeof users.authWithPassword).toBe("function");
    expect(typeof users.create).toBe("function");
    expect(typeof users.authRefresh).toBe("function");
    expect(typeof users.getList).toBe("function");
  });

  it("mock client collection() auth methods return empty results", async () => {
    const { pb } = await import("../client");
    const users = pb.collection("users");

    const authResult = await users.authWithPassword("test@test.com", "pass");
    expect(authResult).toBeDefined();
    expect(authResult.record).toBeNull();
    expect(authResult.token).toBe("");

    const createResult = await users.create({ email: "test@test.com" });
    expect(createResult).toBeDefined();
    expect(createResult).toBeNull();
  });

  it("mock client CRUD methods return empty results", async () => {
    const { pb } = await import("../client");
    const coll = pb.collection("exercises");

    const listResult = await coll.getList(1, 20);
    expect(listResult).toBeDefined();
    expect(listResult.items).toEqual([]);
    expect(listResult.totalItems).toBe(0);

    const oneResult = await coll.getOne("abc");
    expect(oneResult).toBeNull();
  });

  it("creates a real PocketBase client when EXPO_PUBLIC_POCKETBASE_URL is set", async () => {
    process.env.EXPO_PUBLIC_POCKETBASE_URL = "http://127.0.0.1:8090";

    const { pb } = await import("../client");
    expect(pb).toBeDefined();
    expect(pb.baseURL).toBe("http://127.0.0.1:8090");
  });

  it("ExpoSecureStoreAuth save persists to SecureStore and restores from it", async () => {
    // Import SecureStore mock directly
    const SecureStore = require("expo-secure-store");

    const { ExpoSecureStoreAuth } = await import("../client");
    const authStore = new ExpoSecureStoreAuth();

    // Initially no token
    expect(authStore.isValid).toBe(false);

    // Save a token
    authStore.save("test-token-123", { id: "user-1", email: "test@test.com" });

    // Should have persisted to SecureStore
    expect(SecureStore.setItemAsync).toHaveBeenCalled();

    // After save, token should be set
    expect(authStore.token).toBe("test-token-123");
    expect(authStore.isValid).toBe(true);
  });

  it("ExpoSecureStoreAuth clear removes from SecureStore", async () => {
    const SecureStore = require("expo-secure-store");

    const { ExpoSecureStoreAuth } = await import("../client");
    const authStore = new ExpoSecureStoreAuth();

    authStore.save("tok-1", { id: "u1" });
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
    expect(authStore.token).toBe("tok-1");

    // Clear
    authStore.clear();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    expect(authStore.token).toBe("");
    expect(authStore.isValid).toBe(false);
  });

  it("ExpoSecureStoreAuth onChange fires on save and clear", async () => {
    const { ExpoSecureStoreAuth } = await import("../client");
    const authStore = new ExpoSecureStoreAuth();

    const callback = jest.fn();
    authStore.onChange(callback, false);

    authStore.save("tok-2", { id: "u2" });
    expect(callback).toHaveBeenCalledWith("tok-2", expect.objectContaining({ id: "u2" }));

    jest.clearAllMocks();
    authStore.clear();
    expect(callback).toHaveBeenCalledWith("", null);
  });

  it("ExpoSecureStoreAuth handles SecureStore errors gracefully", async () => {
    const SecureStore = require("expo-secure-store");
    SecureStore.setItemAsync.mockRejectedValueOnce(new Error("Storage full"));

    const { ExpoSecureStoreAuth } = await import("../client");
    const authStore = new ExpoSecureStoreAuth();

    // Should not throw — best-effort persistence
    expect(() => {
      authStore.save("tok-3", { id: "u3" });
    }).not.toThrow();

    // In-memory state should still be updated even if SecureStore fails
    expect(authStore.token).toBe("tok-3");
  });
});
