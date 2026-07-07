import { create } from "zustand";
import type { RecordModel } from "pocketbase";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

export interface PocketBaseSession {
  user: RecordModel;
  token: string;
}

/** Sync status for the offline sync engine. */
export type SyncStatus = "idle" | "syncing" | "error" | "dead-letters" | "auth-expired";

export type UserRole = "athlete" | "coach" | null;

interface AuthStore {
  /** Current auth state machine status */
  state: AuthState;
  /** The PocketBase session, null when not authenticated */
  session: PocketBaseSession | null;
  /** The authenticated user record, null when not authenticated */
  user: RecordModel | null;
  /** Current network connectivity status (offline sync) */
  isOnline: boolean;
  /** Current sync engine status */
  syncStatus: SyncStatus;
  /** Human-readable message for the current init/sync step */
  initMessage: string;
  /** The user's role extracted from session.user.role. Null before auth resolves. */
  role: UserRole;

  // Actions
  setSession: (session: PocketBaseSession | null) => void;
  setUser: (user: RecordModel | null) => void;
  setState: (state: AuthState) => void;
  reset: () => void;
  setIsOnline: (online: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setInitMessage: (msg: string) => void;
  /** Returns true when the authenticated user has the "coach" role. */
  isCoach: () => boolean;
  /** Returns true when the authenticated user is an athlete (or no role — defaults to athlete). */
  isAthlete: () => boolean;
}

const initialSyncStatus: SyncStatus = "idle";

/**
 * Extract the user role from a PocketBase record.
 * Missing or unknown role values default to "athlete".
 */
export function extractRole(user: RecordModel | null): UserRole {
  if (!user || !user.role) return "athlete";
  if (user.role === "coach") return "coach";
  return "athlete";
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: "loading",
  session: null,
  user: null,
  isOnline: true,
  syncStatus: initialSyncStatus,
  initMessage: "Starting...",
  role: null,

  setSession: (session) => {
    console.log("[AuthStore] setSession:", session ? { userId: session.user?.id, email: session.user?.email } : null);
    const role = session ? extractRole(session.user) : null;
    console.log("[AuthStore] setSession — role extracted:", role);
    set({
      session,
      user: session?.user ?? null,
      state: session ? "authenticated" : "unauthenticated",
      role,
    });
  },

  setUser: (user) => set({ user }),

  setState: (state) => set({ state }),

  setIsOnline: (online) => set({ isOnline: online }),

  setSyncStatus: (status) => set({ syncStatus: status }),
  setInitMessage: (msg) => set({ initMessage: msg }),

  isCoach: () => {
    const state = get();
    return state.role === "coach";
  },

  isAthlete: () => {
    const state = get();
    return state.role !== "coach";
  },

  reset: () =>
    set({
      state: "unauthenticated",
      session: null,
      user: null,
      role: null,
    }),
}));
