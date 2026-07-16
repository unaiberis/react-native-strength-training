/**
 * PocketBase service barrel export.
 *
 * Re-exports all PocketBase services so consumers can import
 * from a single path: `@/lib/pocketbase`
 *
 * This matches the Supabase barrel pattern and allows a clean
 * cutover by changing the import path from `@/lib/supabase` to
 * `@/lib/pocketbase`.
 */

export { pb } from "./client";
export * from "./services/auth";
export * from "./services/exercises";
export * from "./services/templates";
export * from "./services/sessions";
export * from "./services/prs";
export * from "./services/users";
