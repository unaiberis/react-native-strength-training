import { create } from "zustand";
import type { RecordModel } from "pocketbase";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

export interface PocketBaseSession {
  user: RecordModel;
  token: string;
}

/** Sync status for the offline sync engine. */
export type SyncStatus = "idle" | "syncing" | "error" | "dead-letters" | "auth-expired";

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

  // Actions
  setSession: (session: PocketBaseSession | null) => void;
  setUser: (user: RecordModel | null) => void;
  setState: (state: AuthState) => void;
  reset: () => void;
  setIsOnline: (online: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setInitMessage: (msg: string) => void;
}

const initialSyncStatus: SyncStatus = "idle";

export const useAuthStore = create<AuthStore>((set) => ({
  state: "loading",
  session: null,
  user: null,
  isOnline: true,
  syncStatus: initialSyncStatus,
  initMessage: "Starting...",

  setSession: (session) =>
    set({
      session,
      state: session ? "authenticated" : "unauthenticated",
    }),

  setUser: (user) => set({ user }),

  setState: (state) => set({ state }),

  setIsOnline: (online) => set({ isOnline: online }),

  setSyncStatus: (status) => set({ syncStatus: status }),
  setInitMessage: (msg) => set({ initMessage: msg }),

  reset: () =>
    set({
      state: "unauthenticated",
      session: null,
      user: null,
    }),
}));
