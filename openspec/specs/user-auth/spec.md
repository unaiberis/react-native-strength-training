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

### Update own profile

MUST allow an authenticated user to update their own profile fields (`displayName`, `bodyweight`, `bodyweight_unit`, `height`, `height_unit`, `experience`, `goal`) via the PocketBase `users` collection `update()` endpoint, with `email` shown read-only and the auth-store `user` refreshed after a successful save. Profile updates MUST be online-only; when offline, the save control MUST be disabled with an inline note. (Previously: the "Edit Profile" button only showed an Alert; no write path existed.)

- GIVEN an authenticated user with a valid PocketBase session WHEN they open Edit Profile, set `displayName` to "Jane Doe" and submit while online THEN `updateProfile(userId, { displayName: "Jane Doe", ... })` is called on `pb.collection("users")`, the returned record refreshes the auth-store via `setUser(updatedUser)`, `router.back()` is invoked, and `ProfileScreen` now shows "Jane Doe".
- GIVEN an authenticated user WHEN they submit a profile with `displayName` longer than 50 characters THEN submission is rejected with a Zod field error ("Display name must be 1–50 characters"), no `updateProfile` call is made, and the record is unchanged.
- GIVEN an authenticated user WHEN `isOnline === false` THEN the Save control is disabled, the inline note "You're offline — profile changes need a connection" is shown, and pressing Save has no effect.
- GIVEN an authenticated user WHEN the Edit Profile screen renders THEN the `email` field is displayed in a read-only control (e.g. disabled `Input`) and its value is NOT included in the payload sent to `updateProfile`.
- GIVEN `bodyweight` is provided as a number > 500 or ≤ 0 WHEN validated THEN Zod rejects with a field error and no write occurs.
- GIVEN `bodyweight_unit` / `height_unit` is not one of `metric` | `imperial` WHEN validated THEN Zod rejects with an enum error.
- GIVEN `experience` is not one of `beginner` | `intermediate` | `advanced` WHEN validated THEN Zod rejects with an enum error.
- GIVEN `goal` is not one of `strength` | `hypertrophy` | `endurance` | `general_fitness` WHEN validated THEN Zod rejects with an enum error.
- GIVEN `displayName` is empty (length 0) WHEN validated THEN Zod rejects with a "required" field error.

### Backend Environment Toggle

SHOULD switch between PocketBase and Supabase backends via `EXPO_PUBLIC_API_PROVIDER` env var.

- GIVEN `EXPO_PUBLIC_API_PROVIDER=pocketbase` WHEN services initialize THEN PocketBase client used
- GIVEN `EXPO_PUBLIC_API_PROVIDER=supabase` WHEN services initialize THEN Supabase client used
