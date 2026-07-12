# Seed System — PocketBase Seed Data Generator

## Architecture

The seed system SHALL consist of three standalone scripts in `scripts/`:

| Script | Purpose |
|--------|---------|
| `scripts/seed-pocketbase.mjs` | Parse `supabase/seed.sql` and POST 63 exercises to PocketBase |
| `scripts/seed-demo-data.mjs` | Create templates, sessions, and exercise sets for test users |
| `scripts/seed-teams.mjs` | Create teams, memberships, wellness entries, feedback, and in-progress sessions |

All scripts SHALL support `--clean` flags for additive re-runs. Each script SHALL authenticate as admin via `PB_URL` + admin credentials. The `seed-pocketbase.mjs` script SHALL read exercise data from `supabase/seed.sql` and SHALL include `description` and `video_url` fields in each POST request.

### Scenario: Exercises seeded with metadata

- GIVEN PocketBase is running with the exercises collection
- WHEN `seed-pocketbase.mjs` completes
- THEN all 63 exercises MUST have non-empty `name`, `category`, `description`, `video_url`, `equipment`, `default_sets`, `default_reps`, and `default_rest_seconds`

### Scenario: Idempotent re-run

- GIVEN exercises already exist in PocketBase
- WHEN `seed-pocketbase.mjs` runs again
- THEN it MUST skip duplicates (HTTP 409) and SHALL NOT overwrite existing records

## User Profiles

| Profile | Email | Templates | Sessions | Source |
|---------|-------|-----------|----------|--------|
| Advanced | test@test.com | 18 | 21-23 | seed-demo-data.mjs |
| Beginner | beginner@test.com | 12 | 8-10 | seed-demo-data.mjs |
| Intermediate | intermediate@test.com | 12 | 8-10 + 1 in-progress | seed-demo-data.mjs |
| Demo | demo@test.com | 0 | 0 | — |

All passwords: test123456.

### Scenario: Beginner has session history

- GIVEN seed-demo-data.mjs has run with `--clean`
- WHEN checking workout_sessions for beginner@test.com
- THEN 8-10 completed sessions MUST exist
- AND dates MUST span at least 30 days

### Scenario: New templates assigned to all profiles

- GIVEN 6 new template definitions exist in seed-demo-data.mjs
- WHEN the script runs
- THEN 18 total templates MUST exist across all athlete users
- AND each new template SHALL reference existing exercise IDs from the 63 seeded exercises

## RIR and Tempo on Exercise Sets

Each exercise_set in seeded session data MUST include `rir` (0-3 integer) and `tempo` (string like "20X0", "30X0", or "2010").

### Scenario: All seeded sets have RIR

- GIVEN a seeded session exists for any athlete
- WHEN inspecting its exercise_sets
- THEN every set MUST have `rir` IS NOT NULL
- AND `rir` MUST be between 0 and 3

## Target RPE on Template Exercises

Each template_exercise in seed data MUST include `target_rpe_low` and `target_rpe_high`.

### Scenario: All template exercises have RPE target

- GIVEN a seeded template exists
- WHEN inspecting its template_exercises
- THEN every row MUST have `target_rpe_low` and `target_rpe_high` IS NOT NULL

## Expanded Wellness History

Each athlete SHALL have 14-30 daily wellness entries instead of 1.

### Scenario: Wellness entries span multiple weeks

- GIVEN seed-teams.mjs has run
- WHEN checking daily_wellness for any athlete
- THEN at least 14 entries MUST exist
- AND entries SHALL span at most 30 days

## In-Progress Session for Intermediate

A single in-progress workout session SHALL exist for intermediate@test.com.

### Scenario: Intermediate has active session

- GIVEN seed-demo-data.mjs has run
- WHEN checking workout_sessions for intermediate@test.com
- THEN exactly one record with `status = 'in_progress'` MUST exist
- AND it SHALL have at least 2 exercise_sets logged

## Key Fixes Applied

### app/_layout.tsx
- React Query persister: only cache queries with `status === 'success'`
- Prevents "dehydrated as pending" errors

### src/lib/pocketbase/client.ts  
- `pb.autoCancellation(false)` — prevents PocketBase SDK from aborting duplicate requests

### progression.mjs
- Plateau support: `{ startWeek, endWeek }` freezes progression for intermediate profile
- Logistic accessory progression (was linear)

### sessions.mjs
- PR guarantee: injects PR sets at last PR test week  
- Streak: 0% skip in last 3 weeks
- `SEED_DATE=auto`: dynamic end date, opt-in (default: fixed for determinism)

## Deployment — systemd + nginx

### Arquitectura

```
cliente (https) ──→ nginx:443 ──→ Metro:8082 (web + Expo Go)
cliente (exp://) ──→ nginx:443 ──→ Metro:8082 (Expo Go nativo)
API                               ──→ PocketBase:8090
```

Un solo Metro con `--web` sirve ambos protocolos (HTTP para web, exp para Expo Go) en el mismo puerto. Sin ngrok, sin tunnel.

### systemd services

| Service | Puerto | Comando | Descripción |
|---------|--------|---------|-------------|
| `expo-metro` | 8082 | `expo start --web --port 8082` | Web + Expo Go |
| _(ninguno)_ | 8090 | PocketBase (manual o aparte) | API |

Archivos en `scripts/`:

| Archivo | Destino en server |
|---------|-------------------|
| `expo-metro.service` | `/etc/systemd/system/expo-metro.service` |
| `nginx-entrenamentua.conf` | `/etc/nginx/sites-enabled/entrenamentua.musikak.com` |
| `nginx-api.conf` | `/etc/nginx/sites-enabled/api.entrenamentua.musikak.com` |

### Instalación desde cero

```bash
# Systemd
cp scripts/expo-metro.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable expo-metro
systemctl start expo-metro

# Nginx
cp scripts/nginx-entrenamentua.conf /etc/nginx/sites-enabled/entrenamentua.musikak.com
cp scripts/nginx-api.conf /etc/nginx/sites-enabled/api.entrenamentua.musikak.com
nginx -t && systemctl reload nginx
```

### Logs

```bash
journalctl -u expo-metro -f
journalctl -u nginx -f
```

### nginx: proxy a Metro (8082)

Config en `/etc/nginx/sites-enabled/entrenamentua.musikak.com`:
- `location /` → proxy_pass a localhost:8082 (web + Expo Go)
- `location = /apk` → APK downloads directos
- WebSocket: proxy_set_header Upgrade + Connection
- X-Forwarded-* headers
- SSL via Let's Encrypt
- Long timeouts: proxy_read_timeout 3600s

### nginx: proxy a PocketBase (8090)

Config en `/etc/nginx/sites-enabled/api.entrenamentua.musikak.com`:
- `location /` → proxy_pass a localhost:8090
- SSL separado para subdominio

### Required Metro env vars
```
EXPO_PACKAGER_PROXY_URL=https://entrenamentua.musikak.com
REACT_NATIVE_PACKAGER_HOSTNAME=entrenamentua.musikak.com
```

### Connection URLs
```
Web:   https://entrenamentua.musikak.com
Expo:  exp://entrenamentua.musikak.com
API:   https://api.entrenamentua.musikak.com
APK:   https://entrenamentua.musikak.com/apk
```

## Verification

```bash
npm run seed
PB_URL=https://api.entrenamentua.musikak.com npm run seed
node scripts/verify-seed.mjs --all-profiles  # 105 checks (35 × 3 profiles)
node scripts/inspect-data.mjs stats
```

## Known Issues

- Equipment field may be returned as JSON string (PB field type) — verify-seed warns, doesn't fail
- Epley e1RM may exceed logistic ceiling with 8-rep sets (known Epley artifact)
- demo@test.com user exists from old seed (0 data) — safe to ignore or delete
- RIR/tempo values are seed defaults, not user-entered — verify scripts SHOULD flag excessive RIR (>=3) on compound lifts as a warning
