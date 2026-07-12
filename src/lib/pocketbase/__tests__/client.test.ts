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
    LocalAuthStore: MockBaseAuthStore,
    AsyncAuthStore: class extends MockBaseAuthStore {
      constructor(opts: { save: (s: string) => Promise<void>; clear: () => Promise<void>; initial: Promise<string | null> }) {
        super();
        this._saveFn = opts.save;
        this._clearFn = opts.clear;
      }
      private _saveFn: (s: string) => Promise<void> = async () => {};
      private _clearFn: () => Promise<void> = async () => {};
      async save(token: string, record?: any) {
        await super.save(token, record);
        await this._saveFn(JSON.stringify({ token, record }));
      }
      async clear() {
        await super.clear();
        await this._clearFn();
      }
    },
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

// Mock expo-secure-store
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

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

  it("real client creates PocketBase instance with auth store", async () => {
    process.env.EXPO_PUBLIC_POCKETBASE_URL = "http://127.0.0.1:8090";

    const { pb } = await import("../client");
    expect(pb).toBeDefined();
    expect(pb.baseURL).toBe("http://127.0.0.1:8090");
    // Auth store should be attached
    expect(pb.authStore).toBeDefined();
    expect(typeof pb.authStore.save).toBe("function");
    expect(typeof pb.authStore.clear).toBe("function");
  });
});
