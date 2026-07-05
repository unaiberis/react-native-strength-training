# Seed System — PocketBase Deterministic Data Generator

## Architecture

```
scripts/seed/
├── index.mjs              ← Entry point (7 steps)
├── helpers/
│   ├── prng.mjs           ← Deterministic PRNG (Mulberry32, seed: entrenamentua-demo-2026)
│   ├── api.mjs            ← PocketBase REST API layer (fetch, no SDK)
│   └── validators.mjs     ← Referential integrity + completeness checks
├── data/
│   ├── exercises.mjs      ← 80 exercises across 12 categories
│   └── templates.mjs      ← 18 templates with exercise mappings
├── generators/
│   ├── progression.mjs    ← Logistic S-curve strength progression + plateau support
│   └── sessions.mjs       ← Session generator (78 weeks, PR guarantee, streak zero-skip)
└── profiles.mjs           ← 3 user profiles (beginner/intermediate/advanced)
scripts/verify-seed.mjs    ← 35 checks per profile, --all-profiles flag
scripts/inspect-data.mjs   ← Data inspector CLI (7 views)
```

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

## Profiles

| Profile | Email | Weeks | Sessions | Templates |
|---------|-------|-------|----------|-----------|
| Beginner | beginner@test.com | 16 | 70 | 18 |
| Intermediate | intermediate@test.com | 36 | 156 | 18 |
| Advanced | test@test.com | 78 | 339 | 18 |

All passwords: test123456

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
- equipment field may be returned as JSON string (PB field type) — verify-seed warns, doesn't fail
- Epley e1RM may exceed logistic ceiling with 8-rep sets (known Epley artifact, documented in SEED-SYSTEM.md)
- demo@test.com user exists from old seed (0 data) — safe to ignore or delete
