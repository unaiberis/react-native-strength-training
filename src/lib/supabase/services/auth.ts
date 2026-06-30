import { supabase } from "../client";
import type { LoginInput, RegisterInput } from "../../../shared/schemas/auth";

export interface AuthResult {
  error: string | null;
  user: import("@supabase/supabase-js").User | null;
}

/**
 * Sign up with email and password.
 * Auto-creates a profile via the DB trigger `handle_new_user`.
 */
export async function signUp(input: RegisterInput): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.displayName,
      },
    },
  });

  if (error) {
    return { error: mapAuthError(error.message), user: null };
  }

  return { error: null, user: data.user ?? null };
}

/**
 * Sign in with email and password.
 */
export async function signIn(input: LoginInput): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    return { error: mapAuthError(error.message), user: null };
  }

  return { error: null, user: data.user };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  return { error: error ? mapAuthError(error.message) : null };
}

/**
 * Retrieve the current session (restored from stored token).
 * Call this on app startup to check if the user is already authenticated.
 */
export async function getSession(): Promise<{
  session: import("@supabase/supabase-js").Session | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { session: null, error: mapAuthError(error.message) };
  }

  return { session: data.session, error: null };
}

/**
 * Subscribe to auth state changes (e.g., token refresh, sign out from another tab).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (event: string, session: import("@supabase/supabase-js").Session | null) => void,
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription.unsubscribe;
}

/**
 * Map Supabase error messages to user-friendly strings.
 */
function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("user already registered") || lower.includes("already in use")) {
    return "An account with this email already exists";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid email or password")) {
    return "Invalid email or password";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before signing in";
  }
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please try again later";
  }

  return message;
}
