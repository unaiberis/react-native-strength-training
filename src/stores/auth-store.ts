import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export type AuthState = "loading" | "authenticated" | "unauthenticated";

interface AuthStore {
  /** Current auth state machine status */
  state: AuthState;
  /** The Supabase session, null when not authenticated */
  session: Session | null;
  /** The authenticated user, null when not authenticated */
  user: User | null;

  // Actions
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setState: (state: AuthState) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  state: "loading",
  session: null,
  user: null,

  setSession: (session) =>
    set({
      session,
      state: session ? "authenticated" : "unauthenticated",
    }),

  setUser: (user) => set({ user }),

  setState: (state) => set({ state }),

  reset: () =>
    set({
      state: "unauthenticated",
      session: null,
      user: null,
    }),
}));
