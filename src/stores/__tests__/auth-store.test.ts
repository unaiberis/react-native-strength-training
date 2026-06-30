import { useAuthStore } from "../auth-store";

// Reset the store before each test
beforeEach(() => {
  useAuthStore.setState({
    state: "loading",
    session: null,
    user: null,
  });
});

describe("auth-store", () => {
  // ─── Initial State ───────────────────────────────────────────────────────

  it("starts in loading state", () => {
    const { state } = useAuthStore.getState();
    expect(state).toBe("loading");
  });

  it("starts with null session and user", () => {
    const { session, user } = useAuthStore.getState();
    expect(session).toBeNull();
    expect(user).toBeNull();
  });

  // ─── State Transitions ──────────────────────────────────────────────────

  it("transitions to authenticated when session is set", () => {
    const mockSession = { user: { id: "abc" }, access_token: "tok" } as any;
    useAuthStore.getState().setSession(mockSession);
    const { state, session } = useAuthStore.getState();
    expect(state).toBe("authenticated");
    expect(session).toBe(mockSession);
  });

  it("transitions to unauthenticated when session is cleared", () => {
    // First set a session
    useAuthStore.getState().setSession({ user: { id: "abc" } } as any);
    // Then clear it
    useAuthStore.getState().setSession(null);
    const { state, session } = useAuthStore.getState();
    expect(state).toBe("unauthenticated");
    expect(session).toBeNull();
  });

  it("sets user independently of session", () => {
    const mockUser = { id: "abc", email: "test@test.com" } as any;
    useAuthStore.getState().setUser(mockUser);
    const { user } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
  });

  it("resets to unauthenticated with null user and session", () => {
    // First set everything
    useAuthStore.getState().setSession({ user: { id: "abc" } } as any);
    useAuthStore.getState().setUser({ id: "abc" } as any);
    // Then reset
    useAuthStore.getState().reset();
    const { state, session, user } = useAuthStore.getState();
    expect(state).toBe("unauthenticated");
    expect(session).toBeNull();
    expect(user).toBeNull();
  });

  it("can set state directly", () => {
    useAuthStore.getState().setState("authenticated");
    expect(useAuthStore.getState().state).toBe("authenticated");

    useAuthStore.getState().setState("unauthenticated");
    expect(useAuthStore.getState().state).toBe("unauthenticated");
  });

  // ─── State Machine Guard ────────────────────────────────────────────────

  it("cycles through loading → authenticated → unauthenticated", () => {
    // loading → authenticated
    useAuthStore.getState().setSession({ user: { id: "abc" } } as any);
    expect(useAuthStore.getState().state).toBe("authenticated");

    // authenticated → unauthenticated
    useAuthStore.getState().setSession(null);
    expect(useAuthStore.getState().state).toBe("unauthenticated");

    // unauthenticated → authenticated again
    useAuthStore.getState().setSession({ user: { id: "xyz" } } as any);
    expect(useAuthStore.getState().state).toBe("authenticated");

    // authenticated → unauthenticated via reset
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().state).toBe("unauthenticated");
  });

  it("supports direct state transition to loading", () => {
    useAuthStore.getState().setState("loading");
    expect(useAuthStore.getState().state).toBe("loading");
  });
});
