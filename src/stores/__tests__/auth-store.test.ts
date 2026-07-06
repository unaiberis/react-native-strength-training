import { useAuthStore, extractRole } from "../auth-store";

// Reset the store before each test
beforeEach(() => {
  useAuthStore.setState({
    state: "loading",
    session: null,
    user: null,
    role: null,
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

  // ─── Role Extraction ─────────────────────────────────────────────────────

  describe("role extraction", () => {
    it("extracts 'coach' role from session.user", () => {
      const mockSession = { user: { id: "abc", role: "coach" }, token: "tok" } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().role).toBe("coach");
    });

    it("extracts 'athlete' role from session.user", () => {
      const mockSession = { user: { id: "abc", role: "athlete" }, token: "tok" } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().role).toBe("athlete");
    });

    it("defaults to 'athlete' when role field is missing", () => {
      const mockSession = { user: { id: "abc" }, token: "tok" } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().role).toBe("athlete");
    });

    it("defaults to 'athlete' when role is unknown", () => {
      const mockSession = { user: { id: "abc", role: "admin" }, token: "tok" } as any;
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().role).toBe("athlete");
    });

    it("sets role to null when session is cleared", () => {
      useAuthStore.getState().setSession({ user: { id: "abc", role: "coach" } } as any);
      expect(useAuthStore.getState().role).toBe("coach");
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().role).toBeNull();
    });

    it("sets role to null on reset", () => {
      useAuthStore.getState().setSession({ user: { id: "abc", role: "coach" } } as any);
      useAuthStore.getState().reset();
      expect(useAuthStore.getState().role).toBeNull();
    });
  });

  // ─── isCoach / isAthlete ─────────────────────────────────────────────────

  describe("isCoach / isAthlete", () => {
    it("returns true for isCoach when role is coach", () => {
      useAuthStore.getState().setSession({ user: { id: "abc", role: "coach" } } as any);
      expect(useAuthStore.getState().isCoach()).toBe(true);
      expect(useAuthStore.getState().isAthlete()).toBe(false);
    });

    it("returns false for isCoach when role is athlete", () => {
      useAuthStore.getState().setSession({ user: { id: "abc", role: "athlete" } } as any);
      expect(useAuthStore.getState().isCoach()).toBe(false);
      expect(useAuthStore.getState().isAthlete()).toBe(true);
    });

    it("returns false for isCoach when role is null", () => {
      expect(useAuthStore.getState().isCoach()).toBe(false);
      expect(useAuthStore.getState().isAthlete()).toBe(true);
    });
  });

  // ─── extractRole Pure Function ───────────────────────────────────────────

  describe("extractRole", () => {
    it("returns 'coach' for a coach user", () => {
      expect(extractRole({ role: "coach" } as any)).toBe("coach");
    });

    it("returns 'athlete' for an athlete user", () => {
      expect(extractRole({ role: "athlete" } as any)).toBe("athlete");
    });

    it("returns 'athlete' for null user", () => {
      expect(extractRole(null)).toBe("athlete");
    });

    it("returns 'athlete' when role field is missing", () => {
      expect(extractRole({ id: "abc" } as any)).toBe("athlete");
    });

    it("returns 'athlete' for unknown role value", () => {
      expect(extractRole({ role: "admin" } as any)).toBe("athlete");
    });
  });
});
