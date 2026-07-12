# Fase 7 — Backlog de implementación (tareas pequeñas y aislables)

Cada tarea: objetivo · archivos · dependencias · validaciones · pruebas · criterio de finalización.
Orden sugerido = roadmap Fase 6. Tareas atómicas (1 cambio lógico, PR < 400 líneas).

---

## Quick Wins

### T-12.1 Parametrizar filtros PocketBase
- **Obj:** Reemplazar string-interpolation por filtros parametrizados en 3 servicios.
- **Archivos:** `src/lib/pocketbase/services/program-assignments.ts:32,76`, `feedback.ts:53`, `team-invites.ts:36`.
- **Deps:** —.
- **Valid:** typecheck + lint.
- **Pruebas:** unit tests de `listAssignments`/`listFeedback`/`createInvite` con IDs con comillas.
- **Done:** filtros usan `params` de PocketBase; sin template literals con IDs.

### T-09.1 Visibilidad de asignación sin-equipo
- **Obj:** `listCoachAssignments` incluya `team_id=null` + `coach=currentUser`.
- **Archivos:** `program-assignments.ts:90`.
- **Deps:** —.
- **Valid:** typecheck.
- **Pruebas:** test que asignación sin equipo aparece para el coach.
- **Done:** asignación directa visible en "Assigned Programs".

### T-08.1 Asignación bulk a equipo
- **Obj:** "Assign to all members" crea N `program_assignments`.
- **Archivos:** `app/(coach)/assign.tsx`, `useProgramAssignment.ts`.
- **Deps:** T-09.1.
- **Valid:** lint.
- **Pruebas:** test de `useAssignProgram` con lista de miembros.
- **Done:** todos los atletas del equipo reciben asignación.

### T-07.1 Fuente de rol única
- **Obj:** `extractRole` no default silencioso; `effectiveCoach` solo via memberships.
- **Archivos:** `src/stores/auth-store.ts:62-66`, `app/(auth)/_layout.tsx:17`, `app/(tabs)/_layout.tsx:58`.
- **Deps:** —.
- **Valid:** typecheck.
- **Pruebas:** test de routing por membership (no por `users.role`).
- **Done:** sin misrouting; unknown role → reeducación, no default athlete.

### T-10.1 Vínculo coach↔feedback
- **Obj:** resolver coach vía `team_memberships`; corregir `(user as any).coach_id`.
- **Archivos:** `WorkoutCompleteScreen.tsx:260`, `feedback.ts`, `useSubmitFeedback.ts`.
- **Deps:** T-07.1.
- **Valid:** lint.
- **Pruebas:** test de `submitFeedback` con coach resuelto.
- **Done:** feedback guarda coach correcto.

### T-06.1 Enforcement de permisos
- **Obj:** cablear `permissions.ts` en acciones coach.
- **Archivos:** `src/lib/permissions.ts`, `useTeams.ts`, `app/(coach)/**` (botones).
- **Deps:** T-07.1.
- **Valid:** typecheck.
- **Pruebas:** test de `canChangeRole`/`canAssignProgram` en UI.
- **Done:** roles respetados; deep-link de atleta a acción coach bloqueado.

### T-11.1 PRs/progresión offline + analytics vivo
- **Obj:** añadir `personal_records` al pull set O calcular PRs locales; borrar código muerto `useAnalytics`.
- **Archivos:** `sync-engine.ts:30`, `useAnalytics.ts:156`, `ExerciseTimelineScreen.tsx`.
- **Deps:** (post SPEC-05 recomendado, pero bajo riesgo hacer solo pull set).
- **Valid:** typecheck; `npm test`.
- **Pruebas:** test de PRs offline tras sync; test de charts no-vacíos.
- **Done:** PRs/gráficas funcionan offline; charts renderizan.

---

## Alto impacto

### T-01.1 Hook de consumo de asignaciones
- **Obj:** `useAthleteAssignments()` → `listAssignments(user.id)`.
- **Archivos:** `src/features/programs/hooks/usePrograms.ts`, nuevo `useAthleteAssignments.ts`.
- **Deps:** —.
- **Valid:** lint.
- **Pruebas:** test que hook devuelve asignaciones activas/upcoming.
- **Done:** hook devuelve datos reales (no TODO vacío).

### T-01.2 Programs tab alimentado
- **Obj:** `app/(tabs)/programs.tsx` usa T-01.1; `ProgramDetailScreen` real.
- **Archivos:** `programs.tsx`, `ProgramDetailScreen.tsx`, `WorkoutPreviewScreen.tsx` (quitar placeholder).
- **Deps:** T-01.1.
- **Valid:** typecheck.
- **Pruebas:** render test de Programs con asignación mock.
- **Done:** atleta ve programa asignado; tap abre detalle real.

### T-01.3 Calendario/Home con asignación
- **Obj:** indicador "asignado hoy" en `CalendarScreen` / `app/(tabs)/index.tsx` enlazando a detalle.
- **Archivos:** `CalendarScreen.tsx`, `app/(tabs)/index.tsx`, `useCalendar.ts`.
- **Deps:** T-01.1.
- **Valid:** lint.
- **Pruebas:** test de mapToWorkoutSummary con asignación.
- **Done:** calendario muestra entrenamiento asignado (no solo completados).

### T-02.1 Lector de feedback coach
- **Obj:** `app/(coach)/feedback.tsx` + `useCoachFeedback` → `listFeedback`.
- **Archivos:** nueva ruta + hook; `athlete/[id].tsx` (enlace).
- **Deps:** T-10.1.
- **Valid:** typecheck.
- **Pruebas:** test de lista filtrada por coach.
- **Done:** coach ve feedback de sus atletas.

### T-03.1 Colección + servicio notificaciones
- **Obj:** crear `notifications` (PocketBase) + `notifications.ts` + reemplazar stub hook.
- **Archivos:** nuevo servicio, `useNotifications.ts`, Admin UI rule.
- **Deps:** —.
- **Valid:** typecheck; migración documentada.
- **Pruebas:** test de hook leyendo colección mock.
- **Done:** hook devuelve notificaciones reales.

### T-03.2 Triggers de notificación
- **Obj:** crear `notifications` en `assignProgram` (workout_assigned) y respuesta feedback (feedback_reply).
- **Archivos:** `program-assignments.ts`, `feedback.ts`.
- **Deps:** T-03.1.
- **Valid:** lint.
- **Pruebas:** test de creación de notificación al asignar.
- **Done:** atleta recibe notificación tras asignación.

### T-03.3 Deep-link útil
- **Obj:** `workout_assigned` → programa asignado (no Train genérico).
- **Archivos:** `notification/[id].tsx:29-41`.
- **Deps:** T-01.2.
- **Valid:** lint.
- **Pruebas:** test de navegación desde notificación.
- **Done:** tap abre el programa asignado.

### T-04.1 Wellness dual-write + pull
- **Obj:** escribir `daily_wellness` local + encolar; añadir a pull set; quitar online-only.
- **Archivos:** `useSelfAssessment.ts`, nuevo `offline-wellness.ts`, `sync-engine.ts:30`.
- **Deps:** T-05 (sync base recomendada).
- **Valid:** typecheck.
- **Pruebas:** test de wellness offline→sync→dashboard.
- **Done:** wellness aparece en dashboard; persiste offline.

---

## Infra crítica (con judgment-day)

### T-05.1 Corregir remap feedback
- **Obj:** `workout_feedback` no tiene `dirty/synced_at`; arreglar UPDATE de remap o añadir columnas; setear `synced=1`.
- **Archivos:** `schema.ts:135`, `sync-engine.ts:310`, `offline-feedback.ts`.
- **Deps:** —.
- **Valid:** `npm test` + **judgment-day obligatorio**.
- **Pruebas:** test de flushQueue sin duplicados de feedback.
- **Done:** feedback sincroniza sin duplicar; índice `synced` útil.

### T-05.2 Normalizar status/duration/logged_at
- **Obj:** mapear `active`→`in_progress` en enqueue; unificar duración; añadir `logged_at` offline o excluir del pull.
- **Archivos:** `offline-sessions.ts`, `sync-engine.ts` (CHILD_FK/upsert), `schema.ts`.
- **Deps:** T-05.1.
- **Valid:** typecheck + test + judgment-day.
- **Pruebas:** test de pull de `exercise_sets` sin fallo; duración preservada.
- **Done:** sync de sesiones/sets íntegro online↔offline.

---

## Opcionales (Largo plazo)
- **T-25** Alta directa de atleta por coach (UI + servicio).
- **T-26** Chat/mensajería bidireccional (colección + UI).
- **T-27** Campo `energy` en wellness (modelo + UI + sync).

---
*Cada tarea es revisable de forma aislada. Antes de `sdd-apply` de cualquier grupo, pasar Review Workload Guard; PRs >400 líneas → stacked PRs (`chained-pr`). Strict TDD: test RED primero.*
