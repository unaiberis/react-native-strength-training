# Fase 1 — Mapa del flujo actual Coach ↔ Atleta

Auditoría **read-only** del proyecto `react-native-strength-training` (RN + Expo + TS).
Cada afirmación se rastrea a código leído. No se modificó nada.

## Arquitectura general

- **Una sola app** sirve ambos roles. Route groups: `app/(auth)`, `app/(tabs)` (atleta), `app/(coach)` (entrenador), `app/(workout)` (sesión full-screen modal).
- **Role = dos fuentes fusionadas en navegación:**
  - Global `role` en el usuario (`"athlete" | "coach"`, con default silencioso a `"athlete"` en `extractRole`, `src/stores/auth-store.ts:62-66`).
  - Roles por equipo en `team_memberships.role` (`admin | coach | athlete`).
  - `app/(auth)/_layout.tsx:17` y `app/(tabs)/_layout.tsx:58`: `effectiveCoach = role === "coach" || isTeamCoach`.
- **Gating es client-side** (redirects en layout). No hay protección server-side de rutas en el repo.
- Login único compartido (`LoginScreen`). Registro captura rol (atleta/coach).

## Estado por categoría de flujo

| # | Flujo | Estado actual | Evidencia clave |
|---|-------|---------------|-----------------|
| 1 | Creación de atletas | ⚠️ Solo vía equipo/invitación; no hay "crear atleta" | `coach-athletes.ts:8` (lista desde memberships), `teams/[id].tsx:105` (add por User ID), `join-team.tsx` |
| 2 | Asignación entrenador→atleta | 🟡 Escritura OK, **lectura atleta ausente** | `program-assignments.ts:24` `assignProgram`; `usePrograms.ts:82` devuelve vacío (TODO) |
| 3 | Permisos | 🔴 Lógica en `permissions.ts` **nunca importada**; solo enforcement server-side (Admin UI) | `src/lib/permissions.ts` (dead code), `useTeams.ts` rol hand-rolled inline |
| 4 | Navegación | 🟢 Estructura por route groups, client-side guard | `(coach)/_layout.tsx`, `(tabs)/_layout.tsx` |
| 5 | Onboarding | 🟡 Genérico; `signup-info` hardcodea `/(tabs)` (coach rebota) | `signup-info.tsx:151`; sin onboarding de coach |
| 6 | Comunicación | 🔴 Unidireccional e incompleta; **sin chat, sin notificaciones reales** | `useNotifications.ts:22` stub vacío; feedback es write-only para coach |
| 7 | Seguimiento (historial/progreso) | 🟢 Historial OK; PRs solo online; analytics con código muerto | `useHistory.ts`, `usePersonalRecords.ts`, `useAnalytics.ts:156` retorna `[]` |
| 8 | Planificación | 🟢 Builder completo (prescripción, sets, RPE, %1RM) | `WorkoutBuilderScreen.tsx`, `SetSchemeEditor.tsx` |
| 9 | Gestión de entrenamientos | 🟢 Templates CRUD + librería + asignación | `useTemplates.ts`, `useCoachExercises.ts` |

## El gap central (Crítico)

El coach **puede** crear asignaciones, plantillas y prescripciones. **Ninguna llega al atleta**:
- `usePrograms()` (vista de programas del atleta) devuelve `{currentProgram:null, upcomingPrograms:[]}` y **nunca llama `listAssignments`** (`usePrograms.ts:82-100`, TODO explícito).
- `useProgramDetail()` devuelve `null` (`useProgramDetail.ts:17`).
- El "Entrenamiento de hoy"/Calendario lee `workout_sessions` ya logueadas, no asignaciones.
- `WorkoutPreviewScreen` es placeholder permanente (`WorkoutPreviewScreen.tsx:48-76`).
- `AssignmentDetailScreen` "Phases" es placeholder (`AssignmentDetailScreen.tsx:244`).
- `programBlockId` nunca se pasa en el flujo atleta → rama muerta.

**Conclusión:** `program_assignments` es un ledger write-only para visibilidad del coach. No hay sesiones programadas, ni vista de programa del atleta, ni notificación/push, ni expansión de fases.

## Flujo coach→atleta (ruta completa hoy)

1. Coach confirma → `useAssignProgram` → `assignProgram` → crea/actualiza fila `program_assignments` (`athlete, coach, template, start_date, team_id, status='active'`).
2. Esa fila **solo la relee el coach** (`useCoachAssignments`, `useAssignment`).
3. El atleta no tiene ningún path que la lea.

## Data backbone (resumen)

- Roles reales en `team_memberships.role`; `users.role`/`coach` deprecated pero aún leído en runtime como `coach_id`.
- `program_assignments`, `teams`, `team_memberships` **no se sincronizan offline** (ausentes de `DEFAULT_PULL_COLLECTIONS`, `sync-engine.ts:30-37`).
- Pull set solo: `exercises, workout_templates, workout_template_exercises, workout_sessions, exercise_sets, workout_feedback`.
- **4 desajustes schema↔sync que rompen/corrompen sync offline→online** (ver `03-comparison.md` y `05-specifications.md` spec #5).

## Tech debt / placeholders encontrados

| Lugar | Problema |
|-------|----------|
| `src/lib/permissions.ts` | `permissions` + `useTeamPermissions` definidos, **nunca importados** |
| `usePrograms.ts:83` | atleta nunca consume asignaciones |
| `useProgramDetail.ts:20` | devuelve `null` |
| `WorkoutPreviewScreen.tsx:52,59` | placeholder siempre |
| `PhaseCard.tsx:35` | workouts placeholder |
| `teams/[id].tsx:240` | nombre del equipo no se renderiza (hardcode "Team") |
| `teams/[id].tsx:78` | `handleStartEdit` pisa el nombre con `""` |
| `UnassignedProgramsScreen.tsx:174-175` | `useMyTeams()` llamado 2 veces; 2do resultado sin usar |
| `useProgramAssignments.ts` | shim re-export deprecado |
| `useTemplates.ts:76` | `console.log` debug dejado |
| `program-assignments.ts:90` | lista del coach filtra por `team_id` → asignación sin equipo invisible |
| `useNotifications.ts:22-57` | hook stub, `refetch` no-op, sin colección `notifications` |
| `useAnalytics.ts:156-199` | `getExerciseProgress`/`getPersonalRecordTimeline` siempre `[]` |
| `auth-store.ts:63` | `extractRole` default silencioso a athlete |
| `program-assignments.ts:32,76` / `feedback.ts:53` / `team-invites.ts:36` | filtros PB con string-interpolation (riesgo inyección/crash) |
