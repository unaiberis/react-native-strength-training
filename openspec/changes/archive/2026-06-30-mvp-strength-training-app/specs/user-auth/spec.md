# User Auth Spec

## Purpose

Registration and login via Supabase Auth (email/password). Session persistence across restarts.

## Requirements

### Register

MUST allow registration with email and 8+ char password (1 uppercase).

- GIVEN valid email and password WHEN submitted THEN account created and user signed in
- GIVEN duplicate email WHEN submitted THEN "already in use" error shown

### Session Persistence

MUST persist sessions across app restarts.

- GIVEN user signed in WHEN app restarts THEN session restored
- GIVEN token expired WHEN app restores THEN user signed out, redirected to login
