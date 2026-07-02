# Project Report: Strength Training App (React Native)

> Generado: 2026-07-01 | Proyecto: `react-native-strength-training`
> Propósito: Transferencia completa entre orchestrators — capa "qué existe"
> Consulte también `AGENTS.md` para capa operativa (convenciones, workflow, no-tocar)

---

## 1. Resumen Ejecutivo

App de entrenamiento de fuerza para React Native (Expo), con backend auto-gestionado en PocketBase y capa offline completa con SQLite local + sync engine. Migrada desde Supabase a PocketBase. Arquitectura feature-based con Zustand + TanStack React Query.

**Estado:** MVP completo. 3 cambios SDD archivados. App funcional en producción.

---

## 2. Stack Tecnológico

| Capa                | Tecnología                                     | Versión                  |
| ------------------- | ---------------------------------------------- | ------------------------ |
| **Framework**       | React Native + Expo SDK                        | 0.76.6 / ~52.0.0         |
| **Router**          | Expo Router                                    | ~4.0.0 (file-based)      |
| **Lenguaje**        | TypeScript strict                              | ~5.3.0                   |
| **Estilo**          | NativeWind v4 + TailwindCSS                    | v4 / ^3.4.0              |
| **Estado cliente**  | Zustand                                        | v5                       |
| **Server state**    | TanStack React Query                           | ^5.56.0                  |
| **Backend**         | PocketBase (self-hosted)                       | ^0.27.0                  |
| **Offline DB**      | expo-sqlite                                    | ~15.1.4                  |
| **Auth**            | PocketBase Auth + expo-secure-store            | ~14.0.0                  |
| **Forms**           | react-hook-form + zod                          | ^7.53.0 / ^3.23.0        |
| **Testing**         | Jest + ts-jest + @testing-library/react-native | ~29.7.0                  |
| **CI**              | GitHub Actions                                 | —                        |
| **Node**            | —                                              | v22.22.3                 |
| **npm**             | —                                              | 10.9.8                   |
| **JDK**             | —                                              | OpenJDK 17.0.19          |
| **iOS bundle ID**   | —                                              | com.strengthtraining.app |
| **Android package** | —                                              | com.strengthtraining.app |

### Backend PocketBase

- **URL producción:** `https://api.entrenamentua.musikak.com`
- **Versión:** ^0.27.0 (pinned en package.json)
- **Mock client:** Cuando `EXPO_PUBLIC_POCKETBASE_URL` no está configurada, `createMockClient()` devuelve un mock — todas las operaciones devuelven datos vacíos. Útil para tests y desarrollo sin backend real.
- **No hay EAS Config:** No existe `eas.json`. El proyecto no usa EAS Build — el APK se compila con `npx expo run:android`.
- **PocketBase deploy:** No hay docker-compose ni scripts de backup documentados. `pb_data/` debe respaldarse manualmente.
- **Migraciones PocketBase:** No existe `pb_migrations/`. Las colecciones se configuran manualmente desde Admin UI. **Esto es deuda técnica.** Cualquier cambio de schema PocketBase debe documentarse en `openspec/specs/` antes de aplicarlo.

---

## 3. Estructura del Proyecto

```
react-native-strength-training/
├── app/                          # Expo Router pages (file-based routing)
│   ├── _layout.tsx               # Root: QueryClientProvider + AuthGate offline-aware
│   ├── (auth)/                   # Auth flow (login, register)
│   ├── (tabs)/                   # Main tabs (Home, Train, Programs, Progress, Profile)
│   ├── (workout)/                # Active workout (fullScreenModal)
│   ├── exercises/                # Exercise library + detail
│   ├── routines/                 # Routine list + create + edit
│   └── history/                  # Workout history + detail
├── src/
│   ├── features/                 # Feature modules (7 features)
│   │   ├── auth/                 # Auth (hooks: useAuth, screens: Login, Register)
│   │   ├── workout/              # Workout execution (hooks: useWorkoutSession, useRestTimer)
│   │   ├── routines/             # Routine builder (hooks: useTemplates)
│   │   ├── exercises/            # Exercise library (hooks: useExercises)
│   │   ├── history/              # Workout history (hooks: useHistory)
│   │   ├── records/              # Personal records (hooks: usePersonalRecords)
│   │   ├── profile/              # User profile (screens)
│   │   └── e2e/                  # Critical path documentation (no E2E tests)
│   ├── lib/
│   │   ├── pocketbase/           # Client mock-aware + services (auth, exercises, templates, sessions, prs)
│   │   ├── db/                   # Offline sync layer (14 files)
│   │   │   ├── database.ts       # Singleton SQLite connection (:memory: supported for tests)
│   │   │   ├── schema.ts         # DDL 9 tablas + índices + migraciones idempotentes (schema_version=1)
│   │   │   ├── change-queue.ts   # FIFO queue, group atomicity, auth_error/dead_letter states
│   │   │   ├── sync-engine.ts    # Push-pull orchestrator, ID remapping, backoff (429 lines)
│   │   │   ├── network-monitor.ts# NetInfo wrapper, 2s debounce, singleton
│   │   │   ├── id-mapping.ts     # local↔server ID mapping + child FK propagation + queue patching
│   │   │   ├── sync-meta.ts      # KV store: last_synced_at, active_session_id, auth_expired
│   │   │   ├── sqlite-storage.ts # React Query persister adapter (read cache)
│   │   │   ├── init.ts           # getDb() + runMigrations() entry point
│   │   │   ├── uuid.ts           # nanoid-based offline UUID generation
│   │   │   └── services/         # OfflineSessionsService + OfflineTemplatesService
│   │   └── supabase/             # Legacy — en desuso (no eliminar sin confirmar imports)
│   ├── stores/
│   │   ├── auth-store.ts         # Zustand: session, syncStatus, isOnline, state machine
│   │   └── session-store.ts      # Zustand: activeSession, exercises, restTimer, loggedSets
│   ├── shared/
│   │   ├── ui/                   # Button, Card, Input, RestTimer
│   │   ├── schemas/              # Zod: auth, set, template
│   │   └── utils/                # pr-calc.ts (Epley formula, volume, tonnage)
│   └── types/
│       └── pocketbase.ts         # ExerciseRow, TemplateRow, SessionRow, ExerciseSetRow
├── openspec/                     # OpenSpec artifacts
│   ├── config.yaml               # SDD config (tdd:true, test_command, coverage_threshold:80)
│   ├── specs/                    # 8 spec files (source of truth por feature)
│   └── changes/archive/          # 3 cambios archivados (MVP, Backend Migration, Offline Sync)
├── scripts/
│   ├── seed-pocketbase.mjs       # Seed ejercicios (63)
│   ├── seed-demo-data.mjs        # Seed demo híbrido (181 registros)
│   └── build-apk.sh              # Build APK script
├── supabase/                     # Legacy — migraciones + seed.sql de Supabase original
├── .github/workflows/ci.yml      # CI: npx tsc --noEmit → npx jest --passWithNoTests
├── .env                          # Config producción
├── tailwind.config.js            # Tokens de diseño (surface + brand)
├── app.json                      # Expo config (version 1.0.0, dark, plugins)
├── jest.config.js                # node env, ts-jest, @/ alias
└── tsconfig.json                 # strict: true, paths @/ → src/
```

---

## 4. Routing (Expo Router)

```
Root Layout (_layout.tsx)
├── QueryClientProvider
│   └── AuthGate (state: loading → authenticated/unauthenticated)
│       ├── (auth)/
│       │   ├── login.tsx      → LoginScreen
│       │   └── register.tsx   → RegisterScreen
│       ├── (tabs)/
│       │   ├── _layout.tsx    → Tabs (Home, Train, Programs, Progress, Profile)
│       │   ├── index.tsx      → HomeScreen (stats, quick actions)
│       │   ├── train.tsx      → Start workout
│       │   ├── programs.tsx   → (vacío — pendiente)
│       │   ├── progress.tsx   → ProgressScreen (PRs)
│       │   └── profile.tsx    → ProfileScreen
│       ├── exercises/
│       │   ├── index.tsx      → ExerciseListScreen
│       │   └── [id].tsx       → ExerciseDetailScreen
│       ├── routines/
│       │   ├── index.tsx      → RoutineListScreen
│       │   ├── new.tsx        → RoutineFormScreen (create)
│       │   └── [id]/edit.tsx  → RoutineFormScreen (edit)
│       ├── history/
│       │   ├── index.tsx      → HistoryListScreen
│       │   └── [id].tsx       → HistoryDetailScreen
│       └── (workout)/
│           └── active.tsx     → ActiveWorkoutScreen (fullScreenModal)
```

---

## 5. Features Completadas

### ✅ Auth (user-auth)

- Login/register con PocketBase, validación Zod
- Token persistido en SecureStore (native) / localStorage (web)
- Mock client para desarrollo sin backend
- Offline-aware: token válido localmente funciona sin conexión
- Auth gate en _layout.tsx: init SQLite → restore auth → decide ruta
- Manejo de expired token: flag auth_expired, banner UI, resume tras relogin

### ✅ Exercise Library (exercise-library)

- Listado paginado (20/page) con filtro por categoría
- Búsqueda por nombre (case-insensitive, PocketBase `~`)
- Detalle de ejercicio con métricas
- 8 categorías: strength, hypertrophy, endurance, mobility, power, cardio, crossfit, hybrid
- 63 ejercicios seed desde `scripts/seed-pocketbase.mjs`

### ✅ Routine Builder (routine-builder)

- CRUD de plantillas con ejercicios ordenados (sort_order)
- Targets por ejercicio: sets, reps, RPE (low/high), descanso (segundos)
- Offline-aware: dirty flag + change queue + group_id atómico
- Reordenar ejercicios (solo online — offline no soportado)

### ✅ Workout Execution (workout-execution)

- Sesión activa desde template o fresh
- Logging de sets: peso, reps, RPE (0.5 interval), RIR, warmup
- Rest timer con countdown MM:SS, auto-stop al llegar a 0
- Completar sesión (compute duración en minutos) / cancelar sesión
- Offline-aware: crea/loggea/completa/cancela con OfflineSessionsService

### ✅ Workout History (workout-history)

- Listado paginado de sesiones completadas (20/page)
- Filtros por fecha (desde/hasta) y ejercicio
- Detalle con sets agrupados por ejercicio + nombre de template
- Offline-aware: lee de SQLite local cuando offline

### ✅ Personal Records (personal-records)

- PRs calculados on-the-fly desde exercise_sets (no tabla separada)
- Métricas: 1RM, Estimated 1RM (Epley), Best Volume Set, Max Weight, Max Reps, Total Tonnage
- Historial de evolución de PRs por tipo y ejercicio
- Detección de PR en tiempo real al loggear set
- Check PR: ¿el peso×reps actual supera el mejor anterior?

### ✅ Offline Sync Layer (offline-sync-layer) ⭐

- Ver §6 para arquitectura completa

---

## 6. Arquitectura Offline (Sync Layer)

### 6.1 Componentes Clave

| Archivo                | LOCs | Propósito                                                   |
| ---------------------- | ---- | ----------------------------------------------------------- |
| `schema.ts`            | 210  | DDL 9 tablas + índices + migraciones idempotentes           |
| `database.ts`          | 62   | Singleton SQLite, soporta `:memory:` para tests             |
| `change-queue.ts`      | 152  | FIFO queue, group atomicity, estados dead_letter/auth_error |
| `sync-engine.ts`       | 429  | Push-pull orchestrator, ID remapping, backoff               |
| `network-monitor.ts`   | 153  | NetInfo wrapper singleton, 2s debounce                      |
| `id-mapping.ts`        | 102  | local↔server ID mapping, child FK update, queue patching    |
| `sync-meta.ts`         | 102  | KV store: last_synced_at, active_session_id, auth_expired   |
| `sqlite-storage.ts`    | —    | React Query persister adapter                               |
| `init.ts`              | 25   | Punto de entrada: getDb() + runMigrations()                 |
| `uuid.ts`              | —    | nanoid-based UUID generation offline                        |
| `offline-sessions.ts`  | 209  | Write session/sets a SQLite + enqueue change                |
| `offline-templates.ts` | 207  | Write templates a SQLite + enqueue change                   |

### 6.2 Política de Resolución de Conflictos

```
Política: Last-Write-Wins (LWW) por registro, basado en updated_at.

- En escritura local: se usa Date.now() ISO 8601 como timestamp.
- En sync push: el cliente envía su versión; PocketBase la acepta (es source of truth online).
- En sync pull: PocketBase pisa SQLite local vía INSERT OR REPLACE.
- En empate (mismo updated_at): GANA EL SERVIDOR para sessions/templates.
  GANA EL CLIENTE para exercise_sets (la intención del usuario es prioritaria).
- No se usa CRDT: justificación = granularidad por registro + single-user-per-record
  es suficiente. Cada sesión/template pertenece a un único usuario.
- ID remapping: CREATE offline → SyncEngine hace push → recibe server_id →
  id_mapping.storeMapping() → updateChildFKs() → patchPendingQueue().
  Orden FIFO: padre primero, hijos después (grupo atómico).
- Dead letter tras 10 intentos (retry_count >= 10).
- Auth expired (401): todas las entradas pendientes → auth_error.
  Tras relogin se resetan a pending con resetAuthErrors().
```

### 6.3 Schema SQLite — Versión Actual

```
SCHEMA_VERSION_KEY = "schema_version"
CURRENT_SCHEMA_VERSION = "1"
```

| Tabla                        | Columnas clave                                                                                                                                                                                                      | Dirty          | Índices                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------- |
| `exercises`                  | id PK, name, category, equipment, body_region, default_sets, default_reps, description, synced_at                                                                                                                   | No (read-only) | category, synced_at          |
| `workout_templates`          | id PK, local_id UNIQUE, user_id, name, description, is_public, dirty, synced_at, created_at, updated_at                                                                                                             | Sí             | dirty                        |
| `workout_template_exercises` | id PK, local_id UNIQUE, template_id FK, exercise_id, sort_order, target_sets, target_reps, rest_seconds, notes, dirty, synced_at                                                                                    | Sí             | template_id, dirty           |
| `workout_sessions`           | id PK, local_id UNIQUE, user_id, template_id FK, status CHECK(active/completed/cancelled), started_at, completed_at, duration_seconds, notes, dirty, synced_at                                                      | Sí             | status, dirty                |
| `exercise_sets`              | id PK, local_id UNIQUE, session_id FK, exercise_id, set_number, weight_kg, reps, rpe, rir, is_warmup, dirty, synced_at                                                                                              | Sí             | session_id, dirty            |
| `change_queue`               | id INTEGER PK AUTOINCREMENT, action CHECK(create/update/delete), collection, local_id, record_id, data(JSON), group_id, status CHECK(pending/in_flight/dead_letter/auth_error), retry_count, last_error, created_at | —              | status, created_at, group_id |
| `id_mapping`                 | local_id PK, server_id, collection PK, created_at                                                                                                                                                                   | —              | —                            |
| `sync_meta`                  | key PK, value                                                                                                                                                                                                       | —              | —                            |
| `react_query_cache`          | key PK, value                                                                                                                                                                                                       | —              | —                            |

Regla de migración: toda migración nueva incrementa schema_version en 1 y es idempotente (`IF NOT EXISTS`). Añadir en `schema.ts` con `runMigrations()`.

### 6.4 Parámetros de Backoff y Retry

| Parámetro           | Valor                                          |
| ------------------- | ---------------------------------------------- |
| Backoff inicial     | 1.000 ms                                       |
| Factor              | ×2 (exponencial)                               |
| Backoff máximo      | 30.000 ms                                      |
| Jitter              | ±20% (calculado en SyncEngine.getBackoffDelay) |
| Max retries         | 10 intentos (retry_count >= 10 → dead_letter)  |
| Debounce reconexión | 2.000 ms (NetworkMonitor)                      |

### 6.5 Edge Cases de ID Remapping

1. **CREATE offline → push → server_id recibido:**
   - `id_mapping.storeMapping(localId, serverId, collection)`
   - UPDATE local row: SWAP id de local UUID a server_id, dirty=0
   - `id_mapping.updateChildFKs()`: exercise_sets.session_id, workout_template_exercises.template_id
   - `id_mapping.patchPendingQueue()`: reemplaza local UUID por server_id en JSON de entradas pendientes
2. **CREATE offline con hijos (template + template_exercises):**
   - Grupo atómico: misma `group_id` para todas las entradas
   - Si falla alguna, TODO el grupo se re-intenta (nunca parcial)
3. **UPDATE offline sobre registro aún no sincronizado:**
   - `record_id` apunta al server_id (null si es CREATE pendiente)
   - Si record_id es null, el UPDATE queda en cola hasta que el CREATE se complete
4. **DELETE offline sobre registro no sincronizado:**
   - Igual: record_id null → espera a CREATE
5. **Colisión de server_id:**
   - `INSERT OR REPLACE INTO id_mapping` → overwrite seguro
6. **Patch pendiente con replaceAll:**
   - `id_mapping.patchPendingQueue()` hace `data.replaceAll(localId, serverId)`
   - NOTA: si localId aparece como substring de otro ID, hay riesgo de corrupción.
     Los IDs son nanoid (21 chars URL-safe) — riesgo bajo pero existe.
     El spec no contempla este edge case.

### 6.6 React Query Persister

- Solamente persiste queries con keys `['exercises']`, `['exercise-categories']`, `['templates']`
- Excluye explícitamente: queries de sesiones activas, sets, PRs
- Cache max age: 24h
- Buster: `EXPO_PUBLIC_APP_VERSION ?? "1.0.0"`

---

## 7. Diseño Visual — Tokens Exactos

### 7.1 Paleta Surface (Zinc)

| Token       | Clase Tailwind   | Hex       | Uso                                |
| ----------- | ---------------- | --------- | ---------------------------------- |
| surface-50  | `bg-surface-50`  | `#fafafa` | Texto claro (no usado, fondo dark) |
| surface-100 | `bg-surface-100` | `#f4f4f5` | Texto claro                        |
| surface-200 | `bg-surface-200` | `#e4e4e7` | Bordes secundarios                 |
| surface-300 | `bg-surface-300` | `#d4d4d8` | Bordes                             |
| surface-400 | `bg-surface-400` | `#a1a1aa` | Texto secundario                   |
| surface-500 | `bg-surface-500` | `#71717a` | Texto muted / inactivo             |
| surface-600 | `bg-surface-600` | `#52525b` | —                                  |
| surface-700 | `bg-surface-700` | `#3f3f46` | —                                  |
| surface-800 | `bg-surface-800` | `#27272a` | Bordes cards/inputs, divider       |
| surface-900 | `bg-surface-900` | `#18181b` | Fondo cards, tabBar                |
| surface-950 | `bg-surface-950` | `#09090b` | Fondo app principal                |

### 7.2 Paleta Brand (Verde)

| Token     | Hex       | Uso                                 |
| --------- | --------- | ----------------------------------- |
| brand-500 | `#22c55e` | Acentos, active tab, botón primario |
| brand-600 | `#16a34a` | Botón pressed                       |
| brand-700 | `#15803d` | —                                   |
| brand-400 | `#4ade80` | Hover / highlight                   |

### 7.3 Tipografía

| Clase       | Tamaño | Peso                   | Uso                           |
| ----------- | ------ | ---------------------- | ----------------------------- |
| `text-xs`   | 12px   | —                      | Secondary labels              |
| `text-sm`   | 14px   | semibold/font-semibold | Category names, card metadata |
| `text-base` | 16px   | —                      | Body text                     |
| `text-lg`   | 18px   | —                      | Section headers               |
| `text-xl`   | 20px   | —                      | —                             |
| `text-2xl`  | 24px   | font-bold              | Títulos de pantalla           |
| `text-3xl`+ | 30px+  | —                      | PR values, hero numbers       |

**Familia:** System default (no se configura fuente personalizada en tailwind.config.js)

### 7.4 Spacing, Radius, Shadows (Tailwind Default)

| Concepto  | Clases usadas                                        | Notas                                             |
| --------- | ---------------------------------------------------- | ------------------------------------------------- |
| Spacing   | `p-4`, `px-4`, `mb-6`, `gap-3`, `pt-16`              | Escala Tailwind default                           |
| Radius    | `rounded-2xl` (16px), `rounded-xl` (12px)            | Cards y contenedores                              |
| Shadows   | `border border-surface-800`                          | Sin sombras — se usa borde sutil para profundidad |
| Elevación | TabBar: `borderTopWidth: 1, borderTopColor: #27272a` | Borde en vez de shadow                            |

### 7.5 Iconografía

- **Sistema:** Emoji nativo (`Text` con emoji en TabIcon)
- **No hay paquete de iconos:** no se usa `lucide-react-native`, `@expo/vector-icons`, etc.
- **Tamaño emoji:** hereda fontSize del Text contenedor

### 7.6 Convención de Tokens

- Fondo app: `bg-surface-950`
- Cards: `bg-surface-900` + `border-surface-800`
- Texto primario: `text-surface-50`
- Texto secundario: `text-surface-400`
- Texto muted/inactivo: `text-surface-500`
- Acentos/active: `text-brand-500`, `bg-brand-500`
- **Nunca usar hex crudos en className** — siempre a través de tokens `surface-*`/`brand-*`
- Cualquier nuevo color debe añadirse a `tailwind.config.js` y documentarse aquí

---

## 8. Schema PocketBase — Campos, Tipos y Reglas

### 8.1 Colecciones

**NOTA:** No existen `pb_migrations/`. El schema se configura manualmente desde Admin UI de PocketBase (deuda técnica). Las migraciones deben crearse como script JS/Go antes de modificar producción.

#### `exercises`

| Campo                | Tipo                                                                          | Requerido | Default | Índice |
| -------------------- | ----------------------------------------------------------------------------- | --------- | ------- | ------ |
| id                   | text (PK, autogenerate)                                                       | sí        | —       | —      |
| name                 | text                                                                          | sí        | —       | asc    |
| category             | select [strength,hypertrophy,endurance,mobility,power,cardio,crossfit,hybrid] | sí        | —       | asc    |
| equipment            | json (array de strings)                                                       | no        | null    | —      |
| body_region          | text                                                                          | no        | null    | —      |
| description          | text                                                                          | no        | null    | —      |
| default_sets         | number                                                                        | no        | 3       | —      |
| default_reps         | number                                                                        | no        | 10      | —      |
| default_rest_seconds | number                                                                        | no        | 90      | —      |
| is_public            | bool                                                                          | no        | true    | —      |
| created              | autodate                                                                      | —         | —       | —      |
| updated              | autodate                                                                      | —         | —       | —      |

**API rules:** List + View = public. Create/Update/Delete = admin only. Solo seed manual.

#### `users`

Colección estándar de PocketBase. Campos adicionales: `displayName` (text). Auth por email+password.

#### `workout_templates`

| Campo            | Tipo             | Requerido          |
| ---------------- | ---------------- | ------------------ |
| id               | text (PK)        | sí                 |
| user_id          | relation → users | sí                 |
| name             | text             | sí                 |
| description      | text             | no                 |
| program_block_id | text (futuro)    | no                 |
| is_public        | bool             | no (default false) |
| created          | autodate         | —                  |
| updated          | autodate         | —                  |

**API rules:** List/Create/Update/Delete = only if `user_id = @request.auth.id`.

#### `workout_template_exercises`

| Campo               | Tipo                         | Requerido       |
| ------------------- | ---------------------------- | --------------- |
| id                  | text (PK)                    | sí              |
| workout_template_id | relation → workout_templates | sí              |
| exercise_id         | relation → exercises         | sí              |
| sort_order          | number                       | sí              |
| target_sets         | number                       | no (default 3)  |
| target_reps         | number                       | no (default 10) |
| target_rpe_low      | number                       | no              |
| target_rpe_high     | number                       | no              |
| rest_seconds        | number                       | no (default 90) |
| notes               | text                         | no              |
| created             | autodate                     | —               |
| updated             | autodate                     | —               |

**API rules:** List/Create/Update/Delete = auth only (via template ownership).

#### `workout_sessions`

| Campo               | Tipo                                       | Requerido |
| ------------------- | ------------------------------------------ | --------- |
| id                  | text (PK)                                  | sí        |
| user_id             | relation → users                           | sí        |
| workout_template_id | relation → workout_templates               | no        |
| program_block_id    | text                                       | no        |
| status              | select [in_progress, completed, cancelled] | sí        |
| started_at          | autodate                                   | sí        |
| completed_at        | autodate                                   | no        |
| duration_minutes    | number                                     | no        |
| notes               | text                                       | no        |
| created             | autodate                                   | —         |
| updated             | autodate                                   | —         |

**API rules:** List/Create/Update/Delete = only if `user_id = @request.auth.id`.

#### `exercise_sets`

| Campo              | Tipo                        | Requerido          |
| ------------------ | --------------------------- | ------------------ |
| id                 | text (PK)                   | sí                 |
| workout_session_id | relation → workout_sessions | sí                 |
| exercise_id        | relation → exercises        | sí                 |
| set_number         | number                      | sí                 |
| weight_kg          | number                      | no                 |
| reps               | number                      | no                 |
| rpe                | number                      | no                 |
| rir                | number                      | no                 |
| is_warmup          | bool                        | no (default false) |
| logged_at          | autodate                    | sí                 |
| created            | autodate                    | —                  |
| updated            | autodate                    | —                  |

**API rules:** Create/Update/Delete = auth only (via session → user_id). List = auth only.

#### `program_blocks` (futuro — tabla reservada)

No implementada. `workout_templates.program_block_id` y `workout_sessions.program_block_id` son placeholders.

---

## 9. Variables de Entorno — Matriz Completa

| Variable                      | Dev                     | Staging      | Prod                                    | ¿Obligatoria? | Default si falta         |
| ----------------------------- | ----------------------- | ------------ | --------------------------------------- | ------------- | ------------------------ |
| `EXPO_PUBLIC_POCKETBASE_URL`  | `http://localhost:8090` | (no staging) | `https://api.entrenamentua.musikak.com` | Sí para prod  | → mock client            |
| `EXPO_PUBLIC_OFFLINE_ENABLED` | `false`                 | (no staging) | `true` (comentado hoy)                  | No            | `false`                  |
| `EXPO_PUBLIC_APP_VERSION`     | —                       | —            | `1.0.0`                                 | No            | `1.0.0` (buster default) |
| `EXPO_PUBLIC_API_PROVIDER`    | `pocketbase`            | —            | `pocketbase`                            | No            | `pocketbase`             |
| `POCKETBASE_ADMIN_EMAIL`      | Local                   | —            | CI secret                               | Solo seed     | Error en seed            |
| `POCKETBASE_ADMIN_PASSWORD`   | Local                   | —            | CI secret                               | Solo seed     | Error en seed            |

**Regla:** Si `EXPO_PUBLIC_POCKETBASE_URL` no está seteada (string vacía), `createPocketBaseClient()` devuelve un mock que no habla con red.

---

## 10. Testing — Estrategia por Tipo

### 10.1 Distribución (25 test files)

| Tipo                     | Files                                                                                                                                   | Stack                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| **Unit (puro)**          | shared/schemas (3), shared/utils (1), stores (2), types (1)                                                                             | ts-jest, node env                  |
| **Unit (mocks)**         | pocketbase/services (5), pocketbase/client (1), auth/hooks (1)                                                                          | ts-jest, jest.mock para PocketBase |
| **DB (SQLite :memory:)** | db/ (9): schema, database, change-queue, id-mapping, sync-engine, sync-meta, uuid, network-monitor, offline-sessions, offline-templates | ts-jest, expo-sqlite mock?         |
| **Integration**          | db/**tests**/integration.test.ts                                                                                                        | —                                  |

### 10.2 Mocks

- **PocketBase:** Se mockea via `jest.mock('@/lib/pocketbase/client')` — el `pb` exportado se reemplaza. También existe `createMockClient()` en client.ts para desarrollo offline. Para tests, se usa `jest.mock` con factories manuales que devuelven datos controlados.
- **SQLite:** Se usa `:memory:` como nombre de DB en `getDb(":memory")`. `closeDb()` en `afterEach` + `resetDb()` para aislar tests. No se mockea `expo-sqlite` — se usa la implementación real con DB en memoria.
- **NetInfo:** Se mockea `@react-native-community/netinfo` con `jest.mock`. NetworkMonitor se testea con instancia fresca y listeners manuables.
- **expo-secure-store:** Se mockea con `jest.mock('expo-secure-store')` devolviendo null/hardcodeado.

### 10.3 Patrón TDD

- Tests colocalizados: `__tests__/` dentro del directorio del módulo
- Naming: `*.test.ts` / `*.test.tsx`
- Fixtures: en el mismo `__tests__/` o inline en el test (no hay `__fixtures__/` aún)
- Coverage threshold: 80% **por archivo nuevo** (no global, configurado en openspec/config.yaml)
- E2E: **NO existen tests E2E**. Solo documentación de critical path en `src/features/e2e/E2E_CRITICAL_PATH.md`

### 10.4 Comandos

```bash
npm test              # jest completo
npm run test:watch    # jest --watch
npx jest --coverage   # coverage report
npx tsc --noEmit      # type check standalone
```

---

## 11. SDD — Workflow Detallado

### 11.1 Comando de Entrada

```
/sdd-new "cambiar X por Y"   # → explore → proposal → spec → design → tasks → apply → verify → archive
/sdd-ff "nombre"             # Fast-forward: proposal → spec → design → tasks
```

### 11.2 Reglas del Workflow

1. **Strict TDD:** test fallando primero (RED) → implementar (GREEN) → refactorizar (REFACTOR). Nunca código sin test.
2. **Stacked PRs:** ~400 líneas máximo por PR. Encadenados a main con `branch-pr` + `chained-pr` skills.
3. **Coverage threshold:** 80% mínimo por archivo modificado/nuevo.
4. **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
5. **Branch naming:** `feat/<scope>-<slug>` o `fix/<scope>-<slug>`.
6. **Antes de apply:** siempre pasar por review workload guard. Si forecast >400 líneas, dividir.

### 11.3 Skills Instalados

SDD completo (init, propose, spec, design, tasks, apply, verify, archive, explore, onboard), judgment-day, work-unit-commits, branch-pr, chained-pr, skill-registry, cognitive-doc-design, comment-writer, issue-creation.

---

## 12. ADRs — Architecture Decision Records

### ADR-001: PocketBase sobre Supabase

- **Fecha:** 2026-07-01
- **Contexto:** MVP corrió sobre Supabase (SQL + auth + storage). Costos recurrentes y falta de control sobre la infraestructura limitaban la iteración rápida. PocketBase ofrece SQLite embedido, auth, admin UI, y se auto-aloja.
- **Decisión:** Migrar a PocketBase self-hosted.
- **Consecuencias:** + Control total, sin costo fijo mensual. + Admin UI para seed y CRUD manual. - Mantenimiento de infra propia (backups, actualizaciones, uptime).
- **Alternativas descartadas:** Appwrite (complejidad excesiva), Firebase (lock-in, costo), Supabase (costos),
- **Estado:** Aceptado. Implementado y archivado.
- **Riesgos:** PocketBase es single-binary — escalado vertical. No hay clustering nativo. Si `pb_data/` se corrompe, se pierden datos. No hay réplica configurada.

### ADR-002: SQLite Local + Change Queue sobre ORM

- **Fecha:** 2026-07-01
- **Contexto:** Necesidad de operación offline completa. Opciones: WatermelonDB (ORM con sync build-in), RxDB, o SQLite directo + change queue custom.
- **Decisión:** SQLite directo via `expo-sqlite` + `ChangeQueue` + `SyncEngine` custom.
- **Consecuencias:** + Control granular sobre sync, sin depender de ORM externo. + Sin overhead de WatermelonDB. - Más código a mantener (sync engine completo).
- **Alternativas descartadas:** WatermelonDB (schema rígido, sync protocol lock-in, issues con Expo), RxDB (dependencias pesadas).
- **Estado:** Aceptado. Implementado en 3 PRs stacked.

### ADR-003: TanStack React Query Persister para Reads Offline

- **Fecha:** 2026-07-01
- **Contexto:** Las queries de solo lectura (ejercicios, categorías) deben funcionar offline con datos previamente cacheados.
- **Decisión:** Usar `@tanstack/query-async-storage-persister` con `createSqlitePersister()` que escribe a la tabla `react_query_cache` en SQLite.
- **Consecuencias:** + Lecturas offline inmediatas desde caché. + Sin duplicación de lógica de fetch. - Las mutations no se cachean (solo queries con keys `['exercises']`, `['exercise-categories']`, `['templates']`).
- **Estado:** Aceptado.

### ADR-004: Zustand sobre Redux / Context

- **Fecha:** 2026-07-01
- **Contexto:** Se necesita estado global mínimo: auth state, sesión activa, rest timer.
- **Decisión:** Zustand v5. Dos stores pequeñas (`auth-store.ts`, `session-store.ts`). El server state se maneja con React Query.
- **Consecuencias:** + Stores mínimos (~60-180 líneas cada una). + Sin boilerplate de Redux. - Si crece mucho, migrar a Zustand slices.
- **Estado:** Aceptado.

### ADR-005: Strict TDD con Coverage 80%

- **Fecha:** 2026-07-01
- **Contexto:** Proyecto greenfield con cambios grandes. Necesidad de mantener calidad sin CI bloqueante.
- **Decisión:** Strict TDD mode (SDD): test primero, coverage 80% por archivo nuevo, `npx jest` obligatorio antes de commit.
- **Consecuencias:** + 25 test files, cobertura alta en capa offline y servicios. - Tests añaden tiempo de implementación. + Refactorización segura del sync engine.
- **Estado:** Aceptado.

### ADR-006: Stacked PRs sobre PR Monolítico

- **Fecha:** 2026-07-01
- **Contexto:** Los cambios grandes (~1000-1500 líneas) no pasan el review workload guard de 400 líneas.
- **Decisión:** Dividir en PRs encadenados stacked-to-main. Cada PR ~400 líneas, con su propio scope verificable. Usar chained-pr skill.
- **Consecuencias:** + PRs revisables por humano. + Rollback granular. - Más overhead de CI. + Merge conflicts requieren rebase.
- **Estado:** Aceptado. Backend Migration: 4 PRs. Offline Sync: 3 PRs.

---

## 13. Sección "No Tocar" y Deuda Técnica

### NO MODIFICAR sin aprobación explícita

| Archivo/Directorio             | Razón                                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/db/schema.ts`         | Solo vía migración idempotente + bump schema_version. Cambios directos rompen migraciones.                                    |
| `openspec/specs/*/spec.md`     | Son source of truth de las features. Cambiarlos requiere `/sdd-new` o `/sdd-ff`.                                              |
| `src/lib/db/change-queue.ts`   | Estados `dead_letter` y `auth_error` son críticos. Cambiar la lógica de transición de estados puede perder datos del usuario. |
| `src/lib/db/sync-engine.ts`    | El sync engine es el corazón del offline. Cualquier cambio debe pasar por judgment-day.                                       |
| `src/lib/pocketbase/client.ts` | El mock client es frágil. Cambiar la interfaz `RecordService` mock rompe todos los tests de servicios.                        |
| `scripts/seed-demo-data.mjs`   | 181 registros con IDs referenciados en tests y sesiones demo. Cambiar IDs rompe datos existentes.                             |
| `.env`                         | `EXPO_PUBLIC_OFFLINE_ENABLED=true` descomentar solo después de verificar sync engine en staging.                              |
| `tailwind.config.js`           | Paleta surface y brand. No añadir colores nuevos sin documentarlos aquí.                                                      |

### DEUDA TÉCNICA CONOCIDA y PRIORIZADA

| Item                                                               | Prioridad | Esfuerzo   | Criterio de "Done"                                                                |
| ------------------------------------------------------------------ | --------- | ---------- | --------------------------------------------------------------------------------- |
| Eliminar `@supabase/supabase-js`, `supabase/`, `src/lib/supabase/` | 🔴 Alta   | 2h         | npm uninstall, borrar directorios, confirmar que nada importa de `@/lib/supabase` |
| Activar offline (`EXPO_PUBLIC_OFFLINE_ENABLED=true`)               | 🔴 Alta   | 1h         | Descomentar, testear en dispositivo real, verificar sync ida+vuelta               |
| `programs.tsx` tab vacío                                           | 🟡 Media  | 4h         | Implementar ProgramsListScreen o redirigir a routines/                            |
| Migraciones PocketBase versionadas (pb_migrations/)                | 🟡 Media  | 4-8h       | Crear script JS con migraciones de colecciones existentes                         |
| Backup automático pb_data/                                         | 🟡 Media  | 2h         | Script cron + documentar restauración                                             |
| E2E tests (Detox/Playwright/Maestro)                               | 🟡 Media  | 8-16h      | Primer test E2E que cubra login + crear rutina + workout completo                 |
| `id_mapping.patchPendingQueue` con replaceAll puede corromper IDs  | 🟡 Media  | 2h         | Cambiar replaceAll por regex con word boundaries o validación de formato UUID     |
| Solo 1 commit git en MVP (blame no fiable)                         | 🟢 Baja   | —          | Historial squasheado. No arreglar — aceptar limitación.                           |
| expo-sqlite crashea en web                                         | 🟢 Baja   | —          | Dynamic imports en AuthGate. No resolver — aceptar limitación.                    |
| Sin EAS, sin eas.json                                              | 🟢 Baja   | —          | Build manual con `expo run:android`. Migrar a EAS cuando haya CI/CD de builds.    |
| Sin tests E2E                                                      | 🟡 Media  | ver arriba | Solo hay E2E_CRITICAL_PATH.md con documentación                                   |
| Sin Docker para PocketBase                                         | 🟢 Baja   | 2h         | docker-compose.yml + script de backup                                             |

---

## 14. Build, Deploy y Versionado

### 14.1 Versionado de Releases

- **app.json:** `version: "1.0.0"`
- **Política:** Manual. No hay CI que auto-bumpee. Incrementar `version` en app.json antes de build.
- **Changelog:** No existe `CHANGELOG.md`. El reporte actual y los session summaries de Engram son lo más cercano.

### 14.2 Build APK

```bash
npm run android          # expo run:android (build en caliente)
scripts/build-apk.sh     # Script legacy para APK release
```

APK servido vía nginx en `https://entrenamentua.musikak.com/apk`
Rollback: reemplazar el APK en el servidor con la versión anterior.

### 14.3 PocketBase Deploy

- **Proceso:** Binario único. Scp el binario a servidor, reemplazar, reiniciar servicio.
- **Backup:** `pb_data/` se respalda manualmente (copia del directorio). No hay cron ni snapshot configurado.
- **Upgrade:** PocketBase v0.27.0 pinned. No hay breaking changes conocidos desde v0.23 más allá de las advertencias del release notes.

---

## 15. Convenciones de Código

Resumen rápido (ver `AGENTS.md` para versión completa):

| Concepto                      | Convención                                                             |
| ----------------------------- | ---------------------------------------------------------------------- |
| **Naming archivos screen**    | `PascalCaseScreen.tsx`                                                 |
| **Naming hooks**              | `use<camelCase>.ts`                                                    |
| **Naming services (online)**  | `snake-case.ts` con funciones exportadas planas                        |
| **Naming services (offline)** | `PascalCaseService` class                                              |
| **Stores Zustand**            | `create<StoreName>` + interface arriba, actions en objeto              |
| **Query keys**                | Strings constantes: `EXERCISES_QUERY_KEY`, `TEMPLATES_QUERY_KEY`, etc. |
| **Exports**                   | Named exports siempre. Evitar default exports excepto en `app/` pages. |
| **Zod schemas**               | En `src/shared/schemas/`. `PascalCase` + `Schema` sufijo.              |
| **Tipos PocketBase**          | En `src/types/pocketbase.ts`. Snake_case matching columns.             |
| **Path alias**                | `@/` → `src/`                                                          |
| **Commits**                   | Conventional Commits (feat:, fix:, refactor:, test:, docs:)            |

---

## 16. Métricas Rápidas

| Métrica                 | Valor               |
| ----------------------- | ------------------- |
| Test files              | 25                  |
| Git commits relevant    | 1 (MVP, squasheado) |
| SDD changes archivados  | 3                   |
| OpenSpec specs          | 8                   |
| Features implementadas  | 7                   |
| Tablas SQLite offline   | 9                   |
| Ejercicios seed         | 63                  |
| Demo records (híbridos) | 181                 |
| Engram observations     | ~30                 |
| PRs totales             | ~8                  |
| Versión Node            | 22.22.3             |
| Versión JDK             | 17.0.19             |
| Versión npm             | 10.9.8              |

---

## 17. Contacto / URLs

- **App web:** https://entrenamentua.musikak.com
- **API (PocketBase Admin):** https://api.entrenamentua.musikak.com
- **APK Download:** https://entrenamentua.musikak.com/apk
- **GitHub:** `git@github.com:unaiberis/react-native-strength-training.git`
- **Inspiración:** The Hybrid Coach (YouTube) — metodología hybrid training (strength + endurance/HYROX)

---

_Fin de PROJECT_REPORT.md. Generado 2026-07-01 para transferencia entre orchestrators._
_Consulte AGENTS.md para convenciones operativas, workflow SDD, y "no tocar"._
