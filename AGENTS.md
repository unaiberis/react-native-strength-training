# AGENTS.md — Strength Training App

> Capa operativa para orchestrators entrantes.
> Complementa `PROJECT_REPORT.md` (capa "qué existe").
> Sigue el estándar de herramientas: Commands, Testing, Code Structure, Code Style, Git Workflow, Boundaries.

---

## Commands

### Development

```bash
npm start              # expo start (metro bundler)
npm run android        # expo run:android (build nativo)
npm run ios            # expo run:ios
npm run web            # expo start --web
```

### Testing

```bash
npm test               # jest completo (node env)
npm run test:watch     # jest --watch
npx jest --coverage    # coverage report
npx jest --listTests   # lista todos los test files
```

### Database & Seed

```bash
npm run seed:pb        # seed-pocketbase.mjs — 63 ejercicios a PocketBase
npm run seed:demo      # seed-demo-data.mjs — 181 registros híbridos demo
```

### Build & Type Check

```bash
npx tsc --noEmit       # type check standalone (CI)
npx expo export        # export web build (verificación)
```

### Environment

```bash
# Backup pocketbase data
cp -r pb_data/ pb_data_$(date +%Y%m%d)
```

---

## SDD Workflow (obligatorio para cambios sustanciales)

### Comandos

| Comando | Acción |
|---------|--------|
| `/sdd-new "descripción"` | Start change: explore → proposal → spec → design → tasks → apply → verify → archive |
| `/sdd-ff "nombre"` | Fast-forward: proposal → spec → design → tasks |
| `/sdd-explore "tema"` | Investigar sin crear archivos |
| `/sdd-status [change]` | Estado actual del cambio |
| `/sdd-apply [change]` | Implementar tareas batch |
| `/sdd-verify [change]` | Validar contra specs |
| `/sdd-archive [change]` | Cerrar cambio y archivar |

### Reglas

1. **Strict TDD:** test fallando primero (RED) → implementar (GREEN) → refactorizar (REFACTOR). Nunca código sin test.
2. **Stacked PRs:** ~400 líneas máximo por PR. Encadenados a main con `branch-pr` + `chained-pr` skills.
3. **Coverage threshold:** 80% mínimo por archivo modificado/nuevo.
4. **Conventional Commits:** `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`.
5. **Branch naming:** `feat/<scope>-<slug>` o `fix/<scope>-<slug>`.
6. **Antes de apply:** siempre pasar por review workload guard. Si forecast >400 líneas, dividir en stacked PRs.
7. **Interactive mode por defecto:** entre fases preguntar "proceed/adjust/stop" via `question` tool.
8. **Auto mode:** el orchestrator ejecuta gatekeeper entre fases. Si gate falla 2 veces → STOP y reporte.

### Orden de fases (dependency graph)

```
proposal → specs → design → tasks → apply → verify → archive
             ↑
           design
```

### Engram Topic Keys

| Artifact | Topic Key |
|----------|-----------|
| Init context | `sdd-init/{project}` |
| Proposal | `sdd/{change-name}/proposal` |
| Spec | `sdd/{change-name}/spec` |
| Design | `sdd/{change-name}/design` |
| Tasks | `sdd/{change-name}/tasks` |
| Apply progress | `sdd/{change-name}/apply-progress` |
| Verify report | `sdd/{change-name}/verify-report` |
| Archive report | `sdd/{change-name}/archive-report` |

---

## Testing

### Stack

- **Runner:** Jest 29.7 (node environment — no jsdom ni react-native preset)
- **Transpile:** ts-jest con tsconfig.json
- **Testing library:** @testing-library/react-native ~12.9.0 (para hooks RN)
- **Setup:** `jest.setup.ts` (mocks globales)

### Cómo se mockea cada dependencia

| Dependencia | Estrategia |
|-------------|-----------|
| **PocketBase (client)** | `jest.mock('@/lib/pocketbase/client')` — reemplaza `pb` exportado con mock manual |
| **PocketBase (services)** | Se mockea el client. Los services se testean con ese mock. |
| **expo-sqlite** | No se mockea — se usa `getDb(":memory")` para tests de DB |
| **expo-secure-store** | `jest.mock('expo-secure-store')` — retorna null por defecto |
| **@react-native-community/netinfo** | `jest.mock(...)` — se controla estado online/offline manualmente |
| **expo-router** | No se testea en unit. Los hooks de auth usan router mockeado si es necesario. |

### Patrón de test por tipo

```
src/features/<name>/hooks/__tests__/use<hook>.test.ts
src/lib/<module>/__tests__/<module>.test.ts
src/stores/__tests__/<store>.test.ts
```

- Tests de DB: usan `getDb(":memory")` en `beforeEach`, `closeDb()` en `afterEach`
- Tests de servicios PocketBase: mockean `pb.collection()`
- Tests de hooks RN: usan `renderHook` de `@testing-library/react-native`

### Convenciones

- Naming: `*.test.ts` o `*.test.tsx`
- Fixtures: inline en el test o en el mismo `__tests__/`
- No usar `it.skip` ni `describe.skip` — si un test no corre, se borra
- Coverage threshold: 80% por archivo (config en `openspec/config.yaml`)
- CI ejecuta: `npx tsc --noEmit && npx jest --passWithNoTests`

---

## Code Structure

### Feature module pattern

```
src/features/<feature>/
├── hooks/
│   ├── use<Feature>.ts       # Hook principal (TanStack Query + Zustand)
│   └── __tests__/            # Tests del hook
├── screens/
│   ├── <Feature>Screen.tsx   # Screen component (PascalCase)
│   └── <Feature>DetailScreen.tsx
└── (components/)             # Opcional — componentes privados del feature
```

### Barrel exports

```
src/lib/pocketbase/index.ts   # Re-exporta client + services
src/lib/db/index.ts           # Re-exporta todos los módulos DB
src/stores/auth-store.ts      # Export directo (no barrel)
src/stores/session-store.ts
```

### Shared modules

```
src/shared/
├── ui/                       # Componentes reutilizables (Button, Card, Input, RestTimer)
├── schemas/                  # Zod schemas (auth, set, template)
└── utils/                    # Utilidades puras (pr-calc.ts)
```

### Import paths

Siempre usar alias `@/`:

```typescript
// ✅ Correcto
import { useAuth } from "@/features/auth/hooks/useAuth";
import { pb } from "@/lib/pocketbase/client";
import { Button } from "@/shared/ui/Button";

// ❌ Incorrecto
import { useAuth } from "../../../features/auth/hooks/useAuth";
```

---

## Code Style

### Naming Conventions

| Entidad | Convención | Ejemplo |
|---------|-----------|---------|
| **Archivos screen** | `PascalCaseScreen.tsx` | `ActiveWorkoutScreen.tsx` |
| **Archivos hook** | `useCamelCase.ts` | `useWorkoutSession.ts` |
| **Archivos service (online)** | `snake-case.ts` | `exercises.ts`, `sessions.ts` |
| **Archivos service (offline)** | `PascalCase.ts` | `offline-sessions.ts` |
| **Archivos store** | `kebab-case-store.ts` | `auth-store.ts` |
| **Archivos schema Zod** | `snake-case.ts` | `template.ts` |
| **Archivos tipo** | `snake-case.ts` | `pocketbase.ts` |
| **Funciones** | `camelCase` | `listExercises()`, `getSession()` |
| **Clases** | `PascalCase` | `SyncEngine`, `OfflineSessionsService` |
| **Interfaces** | `PascalCase` | `ExerciseRow`, `SyncResult` |
| **Tipos (type)** | `PascalCase` | `AuthState`, `QueueAction` |
| **Constantes módulo** | `UPPER_SNAKE_CASE` | `EXERCISES_QUERY_KEY`, `PAGE_SIZE` |
| **Exports** | Named exports SIEMPRE | Excepto pages de Expo Router (`app/`) |
| **Default exports** | Solo en `app/` pages | `export default function LoginRoute()` |

### Stores Zustand

```typescript
// Patrón: interface arriba → initial state → create() con actions en línea
interface AuthStore {
  // State
  state: AuthState;
  session: Session | null;
  // Actions
  setSession: (session: Session | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  // Initial state
  state: "loading",
  session: null,
  // Actions
  setSession: (session) => set({ session, state: session ? "authenticated" : "unauthenticated" }),
  reset: () => set({ state: "unauthenticated", session: null }),
}));
```

### Query Keys React Query

```typescript
// Constantes por módulo, en el hook file
const EXERCISES_QUERY_KEY = "exercises";
const CATEGORIES_QUERY_KEY = "exercise-categories";
const TEMPLATES_QUERY_KEY = "templates";
const SESSIONS_QUERY_KEY = "sessions";
const HISTORY_QUERY_KEY = "workout-history";
const PRS_QUERY_KEY = "personal-records";

// Patrón de queryKey:
[KEY]                       // Lista
[KEY, id]                   // Single item
[KEY, category, page, size] // Filtrado
[KEY, "search", query]      // Búsqueda
[KEY, id, isOnline ? "online" : "offline"] // Offline-aware
```

### Hooks por feature — patrón

```typescript
// El hook decide si usa servicio online u offline según `isOnline`
export function useCreateTemplate() {
  const isOnline = useAuthStore((s) => s.isOnline);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: WorkoutTemplateInput) => {
      if (!isOnline) {
        const svc = await createOfflineTemplates(); // dynamic import
        return svc.createTemplate(toOfflineCreateInput(userId!, input));
      }
      return TemplatesService.createTemplate(userId!, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY] });
    },
  });
}
```

**Regla:** El hook decide la fuente. Los screens NUNCA llaman directamente a servicios online u offline.

### Offline Services (Clases)

```typescript
// Patrón: constructor recibe db + changeQueue, métodos write → SQLite + enqueue
export class OfflineSessionsService {
  constructor(
    private db: SQLiteDatabase,
    private changeQueue: ChangeQueue,
  ) {}

  async createSession(userId: string, templateId?: string): Promise<WorkoutSessionRow> {
    const id = generateId();
    // 1. Write to SQLite
    // 2. Enqueue CREATE change
    // 3. Return row
  }
}
```

### Online Services (Funciones)

```typescript
// Patrón: funciones planas, importan pb directo, throw en error
export async function listExercises(
  category?: string | null,
  page = 0,
  pageSize = 20,
): Promise<ExerciseListResult> {
  // ...
}
```

---

## Git Workflow

### Branch Strategy

```
main ← ← ← feat/exercise-filter ← PR ←
       ← ← ← fix/offline-sync-crash ← PR ←
```

- Branches: `feat/<scope>-<slug>` o `fix/<scope>-<slug>`
- Chained PRs (stacked-to-main): PR #1 merge → PR #2 (basado en main post-merge) → PR #3...
- No se usa feature-branch-chain (tracker branch)

### Commits

```bash
git commit -m "feat: add category filter to exercise list"
git commit -m "fix: handle auth_expired flag during offline sync push"
git commit -m "refactor: extract backoff delay calculation to helper"
git commit -m "test: add integration test for syncAll with auth error"
git commit -m "docs: document PocketBase collection schema"
```

- Siempre Conventional Commits
- Sin "Co-Authored-By" ni AI attribution
- Commits atómicos: un cambio lógico por commit

### PR Workflow

1. `branch-pr` skill para crear PR
2. PR < 400 líneas (si no, stacked PR)
3. Reviewer runs review-risk + review-readability
4. Tras merge a main, fechas y versión se actualizan manualmente

---

## Boundaries / "No Tocar"

### 🔴 CRÍTICO — No modificar sin aprobación explícita

| Archivo | Razón |
|---------|-------|
| `src/lib/db/schema.ts` | Solo vía migración idempotente + bump schema_version |
| `openspec/specs/*/spec.md` | Source of truth. Cambiar requiere SDD proposal |
| `src/lib/db/change-queue.ts` | Estados críticos. Puede perder datos del usuario |
| `src/lib/db/sync-engine.ts` | Corazón del offline. Cualquier cambio → judgment-day |
| `src/lib/pocketbase/client.ts` | Mock client frágil. Cambiar mock rompe 5+ test files |
| `scripts/seed-demo-data.mjs` | 181 registros con IDs referenciados |
| `tailwind.config.js` | Paleta design system. No añadir colores sin documentar |

### 🟡 PRECAUCIÓN — Preguntar antes de tocar

| Área | Riesgo |
|------|--------|
| `src/lib/db/id-mapping.ts` | `patchPendingQueue` usa `replaceAll` —edge case de substring ID |
| `src/lib/db/network-monitor.ts` | Singleton — asegurar cleanup en tests con `destroy()` |
| `src/stores/session-store.ts` | Fire-and-forget persist a SyncMeta. No bloquear |
| `app/_layout.tsx` | AuthGate con offline init secuencial. Orden importa |
| `.env` | `OFFLINE_ENABLED=true` descomentar solo tras staging test |

### Deuda Técnica que NO intentar arreglar sin orden

- **Historial git squasheado** (1 commit MVP) — no reescribir
- **expo-sqlite crash en web** — workaround con dynamic imports, no resolver
- **Supabase legacy code** — esperar confirmación de que nada importa antes de borrar
- **Sin EAS** — build manual con `expo run:android`. Migrar solo si se solicita

---

## PocketBase Migration Rules

1. No existe `pb_migrations/`. Para añadir colecciones/campos:
   - Documentar en `openspec/specs/` primero
   - Crear script JS de migración en `scripts/` (futuro `pb_migrations/`)
   - Ejecutar contra Admin UI manualmente
   - NO editar colecciones directamente en producción sin backup
2. Backup `pb_data/` completo antes de cualquier cambio de schema
3. Las reglas de API se configuran en Admin UI
   - `workout_templates`, `workout_sessions`, `exercise_sets`: solo auth user owner
   - `exercises`: list/view público (para lectura), create/update/delete admin

---

## Engram Protocol

- **Save triggers:** bugfix, decisión arquitectónica, discovery, patrón establecido
- **Session summary:** obligatorio al final de cada sesión
- **Topic keys:** usar `architecture/<tema>`, `sdd/<change>/<fase>`
- **No duplicar:** revisar `mem_search` antes de guardar info existente

---

## Estructura Funcional — TheHybridProject

> Fuente: WhatsApp images 2026-07-05. Estructura funcional + flujos de usuario.
> ⚠️ **Referencia de diseño del cliente:** `TheHybridProject_v0_1/` es el prototipo que envía el cliente. Todos los estilos nuevos deben seguir su design system. NO usar estilos alternativos sin consultar.

### Design Tokens (del cliente)

```
Colors:
  background:     #050505  (fondo general)
  backgroundSoft: #0B0B0C  (fondo secundario)
  card:           #171719  (superficie de tarjetas)
  cardSoft:       #222225  (tarjetas hover/secundarias)
  border:         #343437  (bordes sutiles)
  text:           #F4F4F2  (texto principal)
  textMuted:      #A4A4A8  (texto secundario)
  textSubtle:     #707074  (texto terciario)
  titanium:       #B9B9B6  (gris claro decorativo)
  graphite:       #2C2C2E  (gris oscuro)
  success:        #D7D7D2  (éxito)
  danger:         #D65F5F  (error/peligro)

Spacing:  xs:6, sm:10, md:16, lg:24, xl:32, xxl:44
BorderRadius:  18px (buttons/cards), 26px (containers grandes)
BorderWidth:   1px (cards, buttons)
FontWeights:   title/h2:800, h3:700, body:500, small:600
```

### 1. Auth

- Login
- Registro atleta
- Recuperar contraseña

### 2. Athlete App

- Home / Calendario
- Entrenamiento de hoy
- Registro de ejercicio
- Historial
- Evolución
- Métricas de bienestar
- Perfil

### 3. Coach Software

- Dashboard entrenador
- Lista de atletas
- Perfil de atleta
- Crear entrenamiento
- Biblioteca de ejercicios
- Asignar entrenamiento
- Analítica de atleta

### Flujo del Atleta

```
Login → Calendario semanal/mensual → Entrenamiento de hoy → Ver ejercicios
→ Registrar peso / reps / RIR / notas → Marcar entrenamiento completado
→ Enviar feedback
```

### Flujo del Entrenador

```
Login entrenador → Dashboard → Seleccionar atleta → Crear entrenamiento
→ Añadir ejercicios + vídeos → Configurar series, reps, RIR, descanso, notas
→ Asignar fecha → Atleta lo recibe en su calendario
```

### Gap con el Proyecto Actual

| Módulo TheHybridProject | Estado Actual | Gap |
|------------------------|---------------|-----|
| Auth (login, registro, recuperar) | ✅ Existe | Completado |
| Home / Calendario | ❌ No existe | Crear calendario semanal/mensual |
| Entrenamiento de hoy | ✅ Existe | `ActiveWorkoutScreen` |
| Registro de ejercicio | ✅ Existe | `ExerciseSetRow` en DB |
| Historial | ✅ Existe | `useHistory` hook |
| Evolución | ⚠️ Parcial | `usePersonalRecords` — falta gráfica evolución temporal |
| Métricas de bienestar | ❌ No existe | Nuevo módulo completo |
| Perfil (atleta) | ❌ No existe | Crear perfil screen |
| Coach Dashboard | ❌ No existe | Nuevo módulo completo |
| Coach → Crear entrenamiento | ⚠️ Parcial | Templates existen pero no hay flujo coach→atleta |
| Coach → Asignar entrenamiento | ❌ No existe | Falta asignación a atleta específico |
| Coach → Analítica de atleta | ❌ No existe | Nuevo módulo |
| Videos en ejercicios | ❌ No existe | Campo `video_url` no existe en schema |
| Feedback del atleta | ❌ No existe | Nuevo modelo de datos |

---

*Fin de AGENTS.md. Complementa PROJECT_REPORT.md.*
*Generado 2026-07-01 para orchestrators entrantes.*
*Actualizado 2026-07-05 con estructura funcional TheHybridProject (WhatsApp images).*
