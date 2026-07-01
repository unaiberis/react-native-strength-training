# Delta: user-auth — Backend Migration to PocketBase

## MODIFIED Requirements

### Requirement: Register

MUST allow registration with email and 8+ character password (1 uppercase) via PocketBase `collection("users").create()`.
(Previously: Supabase Auth signUp with `@supabase/supabase-js`)

- GIVEN valid email and password WHEN submitted THEN account created in PocketBase `users` collection and user signed in
- GIVEN duplicate email WHEN submitted THEN "already in use" error shown
- GIVEN PocketBase unreachable WHEN submitted THEN "service unavailable" error shown

### Requirement: Session Persistence

MUST persist PocketBase auth token in expo-secure-store across app restarts.
(Previously: Supabase session object from `@supabase/supabase-js` persisted in expo-secure-store)

- GIVEN user signed in WHEN app restarts THEN PocketBase token restored and `pb.authStore` hydrated
- GIVEN token expired WHEN app restores THEN user signed out, redirected to login
- GIVEN no stored token WHEN app starts THEN login screen shown

## ADDED Requirements

### Requirement: Backend Environment Toggle

SHOULD switch between PocketBase and Supabase backends via `EXPO_PUBLIC_API_PROVIDER` env var.

- GIVEN `EXPO_PUBLIC_API_PROVIDER=pocketbase` WHEN services initialize THEN PocketBase client used
- GIVEN `EXPO_PUBLIC_API_PROVIDER=supabase` WHEN services initialize THEN Supabase client used
