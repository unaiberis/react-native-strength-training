import { pb } from "../client";
import type { LoginInput, RegisterInput } from "../../../shared/schemas/auth";
import type { RecordModel } from "pocketbase";

export interface AuthResult {
  error: string | null;
  user: RecordModel | null;
}

export interface SessionResult {
  session: { user: RecordModel; token: string } | null;
  error: string | null;
}

/**
 * Sign up with email and password.
 * Creates a user via PocketBase users collection.
 */
export async function signUp(input: RegisterInput): Promise<AuthResult> {
  try {
    const record = await pb.collection("users").create({
      email: input.email,
      password: input.password,
      passwordConfirm: input.password,
      displayName: input.displayName,
      role: input.role ?? "athlete",
    });

    return { error: null, user: record ?? null };
  } catch (err: any) {
    return { error: mapAuthError(err), user: null };
  }
}

/**
 * Sign in with email and password using PocketBase auth.
 */
export async function signIn(input: LoginInput): Promise<AuthResult> {
  try {
    const authData = await pb.collection("users").authWithPassword(
      input.email,
      input.password,
    );

    return { error: null, user: authData.record ?? null };
  } catch (err: any) {
    return { error: mapAuthError(err), user: null };
  }
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<{ error: string | null }> {
  pb.authStore.clear();
  return { error: null };
}

/**
 * Retrieve the current session from the stored auth token.
 * Call this on app startup to check if the user is already authenticated.
 */
export async function getSession(): Promise<SessionResult> {
  if (!pb.authStore.isValid) {
    return { session: null, error: null };
  }

  try {
    const authData = await pb.collection("users").authRefresh();
    return {
      session: { user: authData.record, token: authData.token },
      error: null,
    };
  } catch (err: any) {
    // Network error (no HTTP status or status 0) — preserve stored token
    if (!err?.status || err.status === 0) {
      return { session: null, error: "Network unavailable" };
    }
    // 401 / auth error — token truly expired
    pb.authStore.clear();
    return { session: null, error: "Session expired" };
  }
}

/**
 * Subscribe to auth state changes (e.g. token refresh, sign out).
 * Returns an unsubscribe function.
 */
export function onAuthStateChange(
  callback: (token: string, record: RecordModel | null) => void,
): () => void {
  return pb.authStore.onChange((token, record) => {
    callback(token, record);
  });
}

/**
 * Map PocketBase error messages to user-friendly strings.
 */
function mapAuthError(err: any): string {
  const message =
    err?.response?.message ?? err?.message ?? "An unexpected error occurred";
  const lower = message.toLowerCase();

  if (
    lower.includes("already exists") ||
    lower.includes("duplicate") ||
    lower.includes("already in use")
  ) {
    return "An account with this email already exists";
  }

  if (
    lower.includes("invalid login credentials") ||
    lower.includes("invalid email or password") ||
    lower.includes("invalid identity")
  ) {
    return "Invalid email or password";
  }

  if (
    lower.includes("not confirmed") ||
    lower.includes("email not confirmed") ||
    lower.includes("unverified")
  ) {
    return "Please confirm your email before signing in";
  }

  if (
    lower.includes("rate limit") ||
    lower.includes("too many")
  ) {
    return "Too many attempts. Please try again later";
  }

  return message;
}
