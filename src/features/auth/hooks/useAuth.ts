import { useCallback, useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../../../stores/auth-store";
import * as AuthService from "../../../lib/supabase/services/auth";
import type { LoginInput, RegisterInput } from "../../../shared/schemas/auth";

/**
 * Central auth hook.
 *
 * Provides login, register, logout, and session initialization.
 * Syncs auth state to the Zustand store and handles navigation redirects.
 */
export function useAuth() {
  const router = useRouter();
  const segments = useSegments();
  const { state, user, session, setSession, setState, reset } = useAuthStore();

  const isAuthenticated = state === "authenticated";
  const isLoading = state === "loading";

  /**
   * Initialize auth — call once on app mount.
   * Attempts to restore the persisted session.
   */
  const initialize = useCallback(async () => {
    setState("loading");
    const { session } = await AuthService.getSession();
    setSession(session);
  }, [setSession, setState]);

  /**
   * Login with email and password.
   * On success, navigation is handled by the auth state listener in the layout.
   */
  const login = useCallback(
    async (input: LoginInput): Promise<{ error: string | null }> => {
      const result = await AuthService.signIn(input);
      if (result.error) {
        return { error: result.error };
      }
      return { error: null };
    },
    [],
  );

  /**
   * Register a new account.
   * On success, the user is automatically signed in.
   */
  const register = useCallback(
    async (input: RegisterInput): Promise<{ error: string | null }> => {
      const result = await AuthService.signUp(input);
      if (result.error) {
        return { error: result.error };
      }
      return { error: null };
    },
    [],
  );

  /**
   * Sign out and redirect to login.
   */
  const logout = useCallback(async () => {
    await AuthService.signOut();
    reset();
    router.replace("/(auth)/login");
  }, [reset, router]);

  /**
   * Subscribe to auth state changes (token refresh, cross-tab logout, etc.)
   */
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "SIGNED_OUT") {
        reset();
        router.replace("/(auth)/login");
      }
    });

    return unsubscribe;
  }, [reset, router, setSession]);

  return {
    state,
    user,
    session,
    isAuthenticated,
    isLoading,
    initialize,
    login,
    register,
    logout,
  };
}
