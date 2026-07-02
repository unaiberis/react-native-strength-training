import { useCallback, useEffect } from 'react';
import { useAuthStore } from '../../../stores/auth-store';
import * as AuthService from '../../../lib/pocketbase/services/auth';
import type { LoginInput, RegisterInput } from '../../../shared/schemas/auth';

/**
 * Central auth hook.
 *
 * Provides login, register, logout, and session initialization.
 * Syncs auth state to the Zustand store and handles navigation redirects.
 */
export function useAuth() {
  const { state, user, session, setSession, setState, reset } = useAuthStore();

  const isAuthenticated = state === 'authenticated';
  const isLoading = state === 'loading';

  /**
   * Initialize auth — call once on app mount.
   * Attempts to restore the persisted session.
   */
  const initialize = useCallback(async () => {
    setState('loading');
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
    []
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
    []
  );

  /**
   * Sign out and redirect to login.
   *
   * pb.authStore.clear() fires onChange → onAuthStateChange →
   * setSession(null) + reset(). We also call reset() explicitly so
   * the store updates even without listener wiring (e.g. tests).
   * The actual navigation redirect happens in TabsLayout via its
   * effect on state === "unauthenticated".
   */
  const logout = useCallback(async () => {
    await AuthService.signOut();
    reset();
  }, [reset]);

  /**
   * Subscribe to auth state changes (token refresh, cross-tab logout, etc.)
   *
   * PocketBase fires onChange with (token, record) — when record is null,
   * the user has been signed out. We only update the store here — the
   * actual navigation redirect happens in the TabsLayout effect, which
   * watches `state`. This avoids double-redirect race conditions with
   * the explicit `logout()` function.
   */
  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChange((token, record) => {
      if (record) {
        setSession({ user: record, token });
      } else {
        setSession(null);
        reset();
        // navigation happens via TabsLayout effect on state change
      }
    });

    return unsubscribe;
  }, [reset, setSession]);

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
