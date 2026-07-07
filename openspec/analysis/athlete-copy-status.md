# Athlete Module Port Analysis: `feat/ba-athlete-core` → `main`

> Generado: 2026-07-07 para consumo por IA entrante.
> Propósito: documentar cómo se copió el módulo athlete y qué falta aún,
> para que otro agente pueda continuar el trabajo sin perderse.

---

## 1. Resumen

El proyecto `react-native-strength-training` tenía una rama `feat/ba-athlete-core`
con 6 dominios BridgeAthletic para atletas. Esos dominios se portaron a `main`
mediante un ciclo SDD completo (`athlete-core-features`) ejecutado en 4 PRs encadenados
(stacked-to-main).

**Estado actual**: 31 archivos nuevos, 7 modificados, 8 tests nuevos.
**502 tests pasando**, TypeScript limpio.

---

## 2. Cómo se hizo el port

### Fuente original

- **Branch**: `feat/ba-athlete-core` — 1 squashed commit (`319214f`)
- **122 archivos cambiados**, ~16.863 líneas insertadas
- Incluía: version bumps (Expo 52→54, React 18→19, RN 0.76→0.81), i18n/Lingui, vitest
- Esos se **excluyeron** explícitamente del port

### Decisiones arquitectónicas (del Design — Engram #1478)

| # | Decisión | Elección | Por qué |
|---|----------|----------|---------|
| 1 | Tab restructure | Calendar→Home→Train→Programs→Analytics→Progress→Profile | Calendar reemplaza index. Coincide con TheHybridProject |
| 2 | Analytics data source | SQLite local (no PocketBase) | Velocidad + offline. useAnalytics lee directo de SQLite |
| 3 | Block type strategy | Interface + factory pattern, 4 impls | Open/closed principle. Cada tipo tiene su lógica |
| 4 | i18n stripping | Eliminar TODOS los `useLingui`, `t()`, `<Trans>` | Main no tiene i18n. Reemplazo mecánico por strings |
| 5 | Design tokens | Mapear TheHybridProject → NativeWind de main | Main usa `text-surface-*`, `bg-surface-*`, `bg-card` |
| 6 | DB schema v3 | Tabla `daily_wellness`, bump a v3 | Ya existía `react_query_cache`. Schema additive only |

### Estrategia de implementación

4 PRs encadenados a main (stacked-to-main):

```
PR1 - Foundation:  Types → Schema v3 → Session store → Wellness service
PR2 - Pure Logic:  Prescription → Workout summary → BlockTypeStrategy → Analytics-calc
PR3 - Screens/UI:  Calendar → Analytics UI → BlockTimer/Amrap/RPE → SelfAssessment
PR4 - Integration:  Tab restructure → index.tsx → ActiveWorkoutScreen → WorkoutCompleteScreen
```

Cada PR se mergeó a main secuencialmente. Tests migrados de vitest a Jest en el proceso.

### Test migration rules

- `vi.fn()` → `jest.fn()`
- `vi.mock()` → `jest.mock()`
- `vi.spyOn()` → `jest.spyOn()`
- `import { describe, it, expect } from "vitest"` → eliminar (jest globals)

---

## 3. Archivos portados (en main)

### Nuevos source files (23)

| File | Dominio |
|------|---------|
| `app/(tabs)/calendar.tsx` | Calendar |
| `app/(tabs)/home.tsx` | Calendar (Home moved) |
| `app/(tabs)/analytics.tsx` | Analytics |
| `app/(tabs)/analytics/exercise/[id].tsx` | Analytics |
| `app/(workout)/self-assessment.tsx` | Wellness |
| `src/features/calendar/hooks/useCalendar.ts` | Calendar |
| `src/features/calendar/components/CalendarGrid.tsx` | Calendar |
| `src/features/calendar/screens/CalendarScreen.tsx` | Calendar |
| `src/features/analytics/hooks/analytics-calc.ts` | Analytics |
| `src/features/analytics/hooks/useAnalytics.ts` | Analytics |
| `src/features/analytics/components/BarChart.tsx` | Analytics |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | Analytics |
| `src/features/analytics/screens/ExerciseTimelineScreen.tsx` | Analytics |
| `src/features/workout/strategies/BlockTypeStrategy.ts` | Block Types |
| `src/features/workout/components/BlockTimer.tsx` | Block Types |
| `src/features/workout/components/AmrapResultInput.tsx` | Block Types |
| `src/shared/utils/prescription.ts` | Prescription |
| `src/shared/ui/WeightTypeSelector.tsx` | Prescription |
| `src/shared/ui/RpeSlider.tsx` | Prescription |
| `src/shared/utils/workout-summary.ts` | Post-Workout |
| `src/lib/pocketbase/services/wellness.ts` | Wellness |
| `src/features/workout/hooks/useSelfAssessment.ts` | Wellness |
| `src/features/workout/screens/SelfAssessmentScreen.tsx` | Wellness |

### Archivos modificados (7)

| File | Cambio |
|------|--------|
| `app/(tabs)/_layout.tsx` | Tab restructure |
| `app/(tabs)/index.tsx` | Replaced with CalendarScreen |
| `src/stores/session-store.ts` | +blockType, prescription, round, timerMinutes |
| `src/lib/db/schema.ts` | Schema v2→v3, daily_wellness table |
| `src/types/pocketbase.ts` | +BlockType, PrescriptionConfig, WellnessRow |
| `src/features/workout/screens/WorkoutCompleteScreen.tsx` | Summary stats, PR badge, self-assessment link |
| `src/features/workout/screens/ActiveWorkoutScreen.tsx` | Block type strategy integration |

### Tests creados (8)

| File | Qué testea |
|------|-----------|
| `src/features/calendar/hooks/__tests__/useCalendar.test.ts` | buildCalendarMonth |
| `src/features/calendar/components/__tests__/CalendarGrid.test.tsx` | Grid rendering |
| `src/features/analytics/hooks/__tests__/analytics-calc.test.ts` | Volume, consistency, PR timeline |
| `src/features/workout/strategies/__tests__/BlockTypeStrategy.test.ts` | 4 strategies |
| `src/shared/utils/__tests__/prescription.test.ts` | computeTargetWeight |
| `src/shared/utils/__tests__/workout-summary.test.ts` | computeWorkoutSummary |
| `src/lib/pocketbase/services/__tests__/wellness.test.ts` | saveWellness/getWellnessEntry |
| `src/features/workout/hooks/__tests__/useSelfAssessment.test.tsx` | validateSelfAssessment |

---

## 4. Archivos del branch ORIGINAL que NO se portaron

Estos archivos existen en `feat/ba-athlete-core` pero NO están en `main`.

### 4.1 ExerciseVideo — componente inline player

| Archivo | Razón de exclusión |
|---------|-------------------|
| `src/shared/ui/ExerciseVideo.tsx` | Depende de `expo-av` (no instalado en main) y `@lingui/react/macro` (no instalado). Habría que adaptarlo sin i18n y con import dinámico de expo-av |

### 4.2 Tests de componentes (vitest → no migrados)

| Archivo | Notas |
|---------|-------|
| `src/features/analytics/screens/__tests__/AnalyticsScreen.test.tsx` | Test de componente, requiere renderHook + mocked SQLite |
| `src/features/workout/screens/__tests__/ActiveWorkoutScreen.test.tsx` | Test de componente con mocked navigation |
| `src/features/workout/screens/__tests__/WorkoutCompleteScreen.test.tsx` | Test de componente post-workout summary |
| `src/features/calendar/__tests__/profile.test.ts` | Test de perfil en calendario |
| `src/shared/ui/__tests__/BlockTimer.test.ts` | Test de timer control |
| `src/shared/ui/__tests__/RpeSlider.test.ts` | Test de RPE slider |
| `src/shared/__tests__/test-utils.tsx` | Test utilities (custom render, providers) |

### 4.3 Path differences (branch vs main)

En el branch original estos componentes estaban en `src/shared/ui/`. En main se
crearon en `src/features/workout/components/`. La diferencia es solo de
organización — el contenido es equivalente:

| Branch (`feat/ba-athlete-core`) | Main |
|---------------------------------|------|
| `src/shared/ui/BlockTimer.tsx` | `src/features/workout/components/BlockTimer.tsx` |
| `src/shared/ui/AmrapResultInput.tsx` | `src/features/workout/components/AmrapResultInput.tsx` |

---

## 5. LO QUE FALTA — otros branches con funcionalidad sin mergear

### 5.1 Coach Platform — `feat/ba-coach-core` (2 commits)

**Branch commit**: `6a2db86` + `740c37b`

No mergeado a main. Contiene el módulo completo de entrenador:

| Archivos (no exhaustivo) | Descripción |
|--------------------------|-------------|
| `app/(coach)/_layout.tsx` | Coach route layout |
| `app/(coach)/dashboard.tsx` | Coach dashboard |
| `app/(coach)/athletes.tsx` | Athlete list |
| `app/(coach)/athlete/[id].tsx` | Athlete detail |
| `app/(coach)/analytics/[athleteId].tsx` | Athlete analytics |
| `app/(coach)/assign.tsx` | Program assignment wizard |
| `app/(coach)/library.tsx` + subroutes | Exercise library (coach view) |
| `src/features/coach/hooks/useCoachDashboard.ts` | Dashboard data hook |
| `src/features/coach/hooks/useAthleteDetail.ts` | Athlete detail hook |
| `src/features/coach/hooks/useCoachAnalytics.ts` | Coach analytics hook |
| `src/features/coach/hooks/useCoachExercises.ts` | Coach exercise library hook |
| `src/features/coach/hooks/useProgramAssignment.ts` | Program assignment hook |
| `src/lib/pocketbase/services/coach-analytics.ts` | Analytics PB service |
| `src/lib/pocketbase/services/coach-athletes.ts` | Athletes PB service |
| `src/lib/pocketbase/services/program-assignments.ts` | Assignments PB service |
| `scripts/migrate-coach-features.mjs` | Migration script |

**Dependencias**: Auth role check (coach vs athlete), nuevas colecciones PocketBase
(program_assignments, etc.), cambios en RegisterScreen para rol de coach.

**Tests**: 6 test files con ~150+ tests en vitest (requieren migración a Jest).

### 5.2 Athlete Feedback — `feat/athlete-feedback` (1 commit)

**Branch commit**: `824ae21`

No mergeado a main. Feedback post-workout del atleta al entrenador:

| Archivos | Descripción |
|----------|-------------|
| `src/features/workout/hooks/useSubmitFeedback.ts` | Feedback submission hook |
| `src/features/workout/screens/WorkoutCompleteScreen.tsx` | Modificado con feedback UI |
| `src/lib/db/services/offline-feedback.ts` | Offline feedback queue |
| `src/lib/pocketbase/services/feedback.ts` | Online feedback service |
| `src/shared/schemas/feedback.ts` | Zod schema for feedback |
| `src/lib/db/sync-engine.ts` | Modificado para sync feedback |
| `src/lib/db/schema.ts` | Modificado para feedback table |
| `src/types/pocketbase.ts` | + FeedbackRow type |
| Tests | 4 test files |

**Dependencias**: Schema DB bump (conflicto con schema v3 actual), sync-engine
modificado, nueva colección PocketBase `feedback`.

### 5.3 Exercise Videos — `feat/exercise-videos` (2 commits)

**Branch commits**: `516368b` + `32bd152`

No mergeado a main. Videos tutorial de ejercicios:

| Archivo | Descripción |
|---------|-------------|
| `src/types/pocketbase.ts` | + `video_url` field en ExerciseRow |
| `src/lib/db/schema.ts` | v2→v3 migration (CONFLICTO con schema v3 actual) |
| `src/features/exercises/screens/ExerciseDetailScreen.tsx` | + "Watch on YouTube" link |
| `scripts/seed-pocketbase.mjs` | + video_url en seed |
| Tests | 3 suites, 33 tests |

⚠️ **CONFLICTO CRÍTICO**: El feat/exercise-videos usa schema v2→v3 migration,
pero main YA está en v3 (por athlete-core-features). Habría que hacer una
migración v3→v4 o incorporar el ALTER TABLE como parte de la migración existente.

**OpenSpec**: El branch tiene `openspec/changes/exercise-videos/` con
proposal, design, spec, tasks, verify-report, archive-report completos.
El SDD cycle de exercise-videos está "completo" en el branch pero nunca se mergeó.

### 5.4 Gaps vs TheHybridProject (del cliente)

Basado en `AGENTS.md` sección "Estructura Funcional — TheHybridProject":

| Módulo | Estado en main | Gap |
|--------|---------------|-----|
| Auth (login, registro, recuperar) | ✅ Completo | — |
| Home / Calendario | ✅ Calendario portado, Home existe | Calendario semanal/mensual funcional |
| Entrenamiento de hoy | ✅ `ActiveWorkoutScreen` | — |
| Registro de ejercicio | ✅ `ExerciseSetRow` en DB | — |
| Historial | ✅ `useHistory` hook | — |
| Evolución | ⚠️ Parcial | PRs existen en `usePersonalRecords`. Falta gráfica evolución temporal con progresión |
| Métricas de bienestar | ❌ Falta | Self-assessment existe (RPE + Likert), pero no hay dashboard de métricas de bienestar con evolución |
| Perfil (atleta) | ⚠️ Parcial | `ProfileScreen` existe pero es básico: solo logout. Falta editar perfil, métricas personales, foto |
| Coach Dashboard | ❌ No mergeado | En `feat/ba-coach-core` |
| Coach → Crear entrenamiento | ⚠️ Parcial | Templates existen. Falta flujo coach→atleta con asignación |
| Coach → Asignar entrenamiento | ❌ No mergeado | En `feat/ba-coach-core` |
| Coach → Analítica de atleta | ❌ No mergeado | En `feat/ba-coach-core` |
| Videos en ejercicios | ❌ No mergeado | En `feat/exercise-videos` (y parcialmente en `feat/ba-athlete-core`) |
| Feedback del atleta | ❌ No mergeado | En `feat/athlete-feedback` |

---

## 6. Árbol de dependencias para mergear branches pendientes

```
feat/exercise-videos
  └─ Depende: schema.ts v3 actual (CONFLICTO — necesita v3→v4)
  └─ Depende: ExerciseDetailScreen ya modificado por cambios previos
  └─ Tests: 33 tests (migrar vitest→Jest)

feat/athlete-feedback
  └─ Depende: schema.ts (necesita tabla feedback — puede ser v4)
  └─ Depende: sync-engine.ts (añadir feedback queue)
  └─ Depende: WorkoutCompleteScreen (modificado por athlete-core-features)
  └─ Tests: 4 suites (migrar vitest→Jest)

feat/ba-coach-core
  └─ Depende: auth-store.ts (rol de coach, RegisterScreen)
  └─ Depende: nuevas colecciones PocketBase (program_assignments, etc.)
  └─ Depende: tab layout (app/(tabs)/_layout.tsx modificado)
  └─ Tests: 6 suites (migrar vitest→Jest)
  └─── ⚠️ GRANDE: ~50+ archivos nuevos
```

### Orden sugerido para merge

1. **exercise-videos** (más pequeño, trivial si se resuelve schema conflict)
2. **athlete-feedback** (mediano, toca sync-engine)
3. **ba-coach-core** (grande, requiere planificación SDD con chained PRs)

---

## 7. Notas técnicas para la IA entrante

### Schema versioning

Main está en **schema v3** con tabla `daily_wellness`. Cualquier branch que
toque schema.ts necesita:
- Si trae v2→v3 migration: convertir a v3→v4
- Si trae CREATE TABLE: añadirlo al migration block actual
- Si trae ALTER TABLE: añadirlo como paso adicional en v3→v4

### Vitest → Jest migration

Ninguno de los branches pendientes tiene tests migrados a Jest. Todos usan
vitest. La IA entrante debe aplicar las mismas reglas de migración:

```
vi.fn()        → jest.fn()
vi.mock()      → jest.mock()
vi.spyOn()     → jest.spyOn()
import "vitest" → eliminar
vitest.config  → integrar en jest.config.js
```

### Session artifact store

El ciclo `athlete-core-features` usó **Engram** como artifact store.
Los artifacts están en las siguientes topic_keys:

| Artifact | Topic Key |
|----------|-----------|
| Init context | `sdd-init/react-native-strength-training` |
| Proposal | `sdd/athlete-core-features/proposal` |
| Spec | `sdd/athlete-core-features/spec` |
| Design | `sdd/athlete-core-features/design` |
| Tasks | `sdd/athlete-core-features/tasks` |
| Apply Progress | `sdd/athlete-core-features/apply-progress` (PR4) |
| Verify Report | `sdd/athlete-core-features/verify-report` |
| Archive Report | `sdd/athlete-core-features/archive-report` |

Para leerlos: `mem_get_observation(id: <ID>)` con IDs de Engram.
Para buscar: `mem_search(query: "sdd/athlete-core-features")`.

### Tests actuales

```bash
npx jest              # 33 suites, 502 tests — todos pasando
npx tsc --noEmit      # TypeScript clean
```

### Pre-commit checklist para nuevos cambios

1. `npx jest --passWithNoTests` — tests verdes
2. `npx tsc --noEmit` — typescript limpio
3. Coverage ≥ 80% en archivos nuevos/modificados
4. Conventional commit: `feat:`, `fix:`, `refactor:`, `test:`, `chore:`
5. Sin vitest imports (usar `jest.fn()` / `jest.mock()`)
6. Sin i18n/Lingui imports
7. Sin "Co-Authored-By" ni AI attribution

---

## Appendix A: Diagrama de archivos portados vs no portados

```
feat/ba-athlete-core (122 files)
│
├── Portado a main (31+7 files) ─────────────────── ✅
│   ├── Calendar module
│   ├── Analytics module
│   ├── Block Type Strategy
│   ├── Prescription
│   ├── Post-Workout Summary
│   ├── Self-Assessment / Wellness
│   └── Tab Restructure
│
├── NO portado por decisión ────────────────────── ✗
│   ├── i18n/Lingui (20+ files)
│   ├── vitest config (2 files)
│   ├── Expo 54/React 19 bumps (package.json etc.)
│   └── __mocks__/@lingui
│
├── NO portado (podría portarse) ───────────────── ⚠️
│   ├── ExerciseVideo.tsx (depende expo-av)
│   └── 7 test files (vitest→Jest pendiente)
│
└── Ya estaba en main ──────────────────────────── ✅
    ├── useHomeStats.ts
    ├── ProfileScreen.tsx
    ├── session-store.ts (tests)
    └── varios test existing

Otros branches sin mergear:
├── feat/ba-coach-core ─────────── Coach platform (~50 files) ⏳
├── feat/athlete-feedback ──────── Feedback system (~17 files) ⏳
└── feat/exercise-videos ───────── Exercise videos (~10 files) ⏳
```

---

*Fin del análisis. Este archivo está en `openspec/analysis/athlete-copy-status.md`.*
*Para IA entrante: leer este archivo primero, luego los artifacts de Engram.*
