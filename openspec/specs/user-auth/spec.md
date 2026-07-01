# User Auth Spec

## Purpose

Registration and login via PocketBase Auth (email/password). Session persistence across restarts.

## Requirements

### Register

MUST allow registration with email and 8+ character password (1 uppercase) via PocketBase `collection("users").create()`. SQLite init MUST complete BEFORE auth actions on startup.
(Previously: DB init not required before auth)

- GIVEN valid email and password WHEN submitted THEN account created in PocketBase `users` collection and user signed in (unchanged)
- GIVEN duplicate email WHEN submitted THEN "already in use" error shown (unchanged)
- GIVEN PocketBase unreachable WHEN submitted THEN "service unavailable" error shown (unchanged)

### Session Persistence

MUST persist PocketBase auth token in expo-secure-store across app restarts. On startup, SQLite MUST be initialized before auth token restoration.
(Previously: Supabase session object from `@supabase/supabase-js` persisted in expo-secure-store; SQLite not part of startup sequence)

- GIVEN user signed in WHEN app restarts AND online THEN SQLite initialized, PocketBase token restored, `pb.authStore` hydrated, data sync triggered
- GIVEN user signed in WHEN app restarts AND offline AND stored token exists THEN SQLite initialized, auth proceeds offline, main app loaded with offline banner
- GIVEN token expired WHEN app restores AND online THEN user signed out, redirected to login (unchanged)
- GIVEN no stored token WHEN app starts THEN login screen shown (unchanged)

### Sync Auth Error Handling

The system MUST detect expired tokens during sync push and surface a re-login prompt.

- GIVEN sync in progress AND PocketBase returns 401 THEN all queue entries marked `auth_error`, `auth_expired` flag saved, sync halted
- GIVEN `auth_expired` flag set WHEN UI renders THEN persistent banner displayed: "Session expired. Please log in again to sync your data."
- GIVEN user re-authenticates after `auth_expired` THEN queued entries replayed from `auth_error` state, banner dismissed
- GIVEN re-login succeeds WHEN queue flushes THEN normal sync resumes

### Backend Environment Toggle

SHOULD switch between PocketBase and Supabase backends via `EXPO_PUBLIC_API_PROVIDER` env var.

- GIVEN `EXPO_PUBLIC_API_PROVIDER=pocketbase` WHEN services initialize THEN PocketBase client used
- GIVEN `EXPO_PUBLIC_API_PROVIDER=supabase` WHEN services initialize THEN Supabase client used
