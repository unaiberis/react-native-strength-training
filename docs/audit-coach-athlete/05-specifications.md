# Fase 5 — Especificaciones SDD por mejora

Formato por spec: problema · contexto · solución · beneficios · impacto técnico · riesgos · dependencias · criterios de aceptación · casos límite.

---

## SPEC-01 — Consumo de asignaciones por el atleta
- **Problema:** `usePrograms` devuelve vacío y nunca llama `listAssignments`; el atleta es ciego a las asignaciones del coach.
- **Contexto:** `program-assignments.ts:69` `listAssignments(athleteId)` existe y funciona server-side; solo falta el cableado atleta.
- **Solución:** Crear `useAthleteAssignments()` que llama `listAssignments(user.id)`; alimentar `Programs` tab (`currentProgram` = asignación activa, `upcomingPrograms` = futuras por `start_date`); mostrar en Home/Calendar un chip "Entrenamiento asignado hoy" enlazando a `program-detail/[id]` y a `WorkoutPreview` real.
- **Beneficios:** Cierra el lazo coach→atleta (el gap central).
- **Impacto técnico:** Nuevo hook + consumo en `programs.tsx`, `app/(tabs)/index.tsx`, `CalendarScreen`. Reusa `program-assignments` service.
- **Riesgos:** Bajo. No toca schema.
- **Dependencias:** SPEC-05 (sync) para modo offline; SPEC-03 (notificaciones) para avisar.
- **Aceptación:** Dado un `program_assignments` activo para el atleta, Programs tab lo muestra; tap abre detalle; Calendar muestra indicador.
- **Casos límite:** Múltiples asignaciones activas (elegir la de `start_date` más cercana); asignación sin `template` (manejar null); atleta con 0 asignaciones (empty-state correcto).

## SPEC-02 — Lector de feedback para el coach
- **Problema:** `listFeedback()` existe pero no se usa en UI coach; el feedback del atleta es write-only.
- **Contexto:** `feedback.ts:48` `listFeedback()`; `WorkoutCompleteScreen.tsx:250` escribe `workout_feedback` con `coach_id` desde `(user as any).coach_id`.
- **Solución:** Pantalla/lista en `app/(coach)` ("Feedback") que lista `listFeedback` filtrado por coach; enlazar desde dashboard y `athlete/[id]`. Reemplazar `coach_id` deprecado por resolución vía `team_memberships` o campo correcto.
- **Beneficios:** Cierra lazo atleta→coach.
- **Impacto técnico:** Nueva ruta `app/(coach)/feedback.tsx` + hook `useCoachFeedback`.
- **Riesgos:** Medio — depende de corregir el vínculo coach↔feedback (SPEC-10 implícito).
- **Dependencias:** SPEC-10 (fuente de rol/coach).
- **Aceptación:** Coach ve feedback de sus atletas; filtra por atleta; abre detalle de sesión.
- **Casos límite:** Feedback con `coach_id=null`; feedback de atleta fuera de sus equipos (no mostrar).

## SPEC-03 — Backend de notificaciones
- **Problema:** `useNotifications` es stub vacío; no hay colección `notifications`; el coach asigna sin avisar.
- **Contexto:** UI de notificaciones completa (`notifications.tsx`, `notification/[id].tsx`) con tipos `workout_assigned|program_updated|feedback_reply|achievement|system` pero sin datos.
- **Solución:** Crear colección `notifications` (PocketBase) + servicio `notifications.ts` + reempazar stub por hook real (`useNotifications` lee la colección, filtra por `user.id`, marca leído). Generar `notifications` en `assignProgram` (workout_assigned) y en respuesta de feedback (feedback_reply). Deep-link `workout_assigned` → programa asignado (SPEC-15).
- **Beneficios:** Cierra lazo de comunicación; mejora retención.
- **Impacto técnico:** Nueva colección + servicio + hook + 2 triggers de creación. Considerar offline queue para notificaciones enviadas por coach.
- **Riesgos:** Medio — nueva colección requiere migración/Admin UI; orden de creación.
- **Dependencias:** SPEC-01 (para deep-link útil).
- **Aceptación:** Tras asignar, el atleta ve notificación; tap abre el programa; mark-as-read persiste.
- **Casos límite:** Atleta offline al asignar (llegar en próximo pull); muchas notificaciones (paginación); badge de no leídas correcto.

## SPEC-04 — Plumbing de bienestar (wellness) E2E
- **Problema:** `createWellnessEntry` escribe solo a PocketBase; dashboard lee solo SQLite `daily_wellness` (vacío siempre); offline se pierde.
- **Contexto:** `useSelfAssessment.ts:101` online-only; `useWellnessTrends.ts:76` lee local; `daily_wellness` NO está en `DEFAULT_PULL_COLLECTIONS` (`sync-engine.ts:30-37`); no hay `INSERT INTO daily_wellness`.
- **Solución:** Escribir wellness a BOTH SQLite `daily_wellness` (dual-write) + encolar para PocketBase; añadir `daily_wellness` al pull set; permitir offline. Unificar fuente = local SQLite (como history/progress).
- **Beneficios:** Wellness deja de estar roto; coherente con el resto.
- **Impacto técnico:** Nuevo offline service `offline-wellness.ts`; tabla `daily_wellness` ya tipada (`useWellnessTrends.ts:11`); ampliar pull set; quitar online-only.
- **Riesgos:** Medio — cambia data source de wellness de PB a local; validar migración de datos existentes.
- **Dependencias:** SPEC-05 (sync base).
- **Aceptación:** Loguear wellness online y offline → aparece en dashboard; persiste tras reinicio.
- **Casos límite:** Misma fecha ya existe (upsert); timezone del `date` (usar local day, no `toISOString`); campo energía ausente (SPEC-27).

## SPEC-05 — Integridad de sync offline→online
- **Problema:** 4 desajustes rompen/corrompen sync del atleta.
  1. `workout_feedback` remap UPDATE usa `dirty/synced_at` que la tabla no tiene → crash + duplicados en cada retry hasta dead-letter.
  2. Offline `status='active'` vs online `in_progress|completed|cancelled`.
  3. `duration_seconds` (offline) vs `duration_minutes` (online) → duración perdida.
  4. `exercise_sets.logged_at` offline falta columna → pull de `exercise_sets` falla (está en pull set).
- **Solución:** (a) Añadir columnas `dirty`, `synced_at` a `workout_feedback` o corregir remap para esa tabla; (b) mapear `active`→`in_progress` en enqueue; (c) normalizar duración a un campo; (d) añadir columna `logged_at` offline o excluirla del pull upsert. Setear `synced=1` en push exitoso.
- **Beneficios:** Sync confiable; fin de duplicados/corrupción.
- **Impacto técnico:** `schema.ts` (columnas), `sync-engine.ts` (remap), `offline-*.ts` (enqueue), `id-mapping.ts`.
- **Riesgos:** Alto — toca el corazón offline (`sync-engine.ts`, `change-queue.ts`, `id-mapping.ts` marcados CRÍTICO en AGENTS.md). Requiere `judgment-day` post-cambio.
- **Dependencias:** Ninguna (base).
- **Aceptación:** Sesión+sets+feedback logueados offline → se sincronizan sin duplicados ni errores; `exercise_sets` pull no falla.
- **Casos límite:** Reintento tras 401 (auth expired); dead-letter tras 10 intentos; remap de FK hijas (CHILD_FK_MAP cubre 2 relaciones hoy).

## SPEC-06 — Enforcement de permisos
- **Problema:** `permissions.ts` (`canAssignProgram`, etc.) nunca importado; roles hand-rolled inline en `useTeams.ts`; sin protección server en repo.
- **Solución:** Cablear `useTeamPermissions`/`permissions` en rutas coach y acciones (assign, edit team, change role); documentar reglas API server-side en Admin UI (zero-trust).
- **Beneficios:** Authorization consistente y defensiva.
- **Impacto técnico:** Importar y usar `permissions.ts` en `app/(coach)/**` y `useTeams.ts`; agregar reglas en Admin UI (fuera de código).
- **Riesgos:** Medio — cambia comportamiento de botones; coordinar con Admin UI.
- **Dependencias:** SPEC-07 (fuente de rol).
- **Aceptación:** Atleta no puede deep-link a acciones de coach; cambio de rol respetado; `canChangeRole` restringe a admin.
- **Casos límite:** Usuario con membership coach en un equipo, athlete en otro; `admin` promotion gated.

## SPEC-07 — Fuente de rol única
- **Problema:** `users.role` (default silencioso a athlete en `extractRole`) + `team_memberships.role`; `coach_id` leído como `(user as any).coach_id` mientras el tipo lo nombra `coach`.
- **Solución:** Derivar `effectiveCoach` solo de `team_memberships` (ya se hace en `_layout`); deprecar `users.role` en navegación; corregir nombre de campo `coach_id`; eliminar default silencioso (tratar unknown como error/reeducación).
- **Beneficios:** Sin misrouting; una sola fuente de verdad.
- **Impacto técnico:** `auth-store.ts` (`extractRole`), `_layout.tsx`, `WorkoutCompleteScreen.tsx:260`.
- **Riesgos:** Bajo-medio — afecta routing de todos los usuarios.
- **Dependencias:** Ninguna.
- **Aceptación:** Usuario con membership coach ve coach UI; sin membership ve athlete UI; sin default silencioso.
- **Casos límite:** Rol ausente en metadata (reeducar, no default); coach con solo membership athlete.

## SPEC-08 — Asignación bulk a equipo
- **Problema:** `teams/[id].tsx:405` "Assign a training program to all members" pero implementación solo precarga `team_id` y pide 1 atleta.
- **Solución:** Al elegir "a todo el equipo", iterar miembros athlete y crear N `program_assignments` (o una sola con `team_id` + expansión lazy en lectura).
- **Beneficios:** Reduce pasos; cumple el label.
- **Impacto técnico:** `assign.tsx` + `useAssignProgram` (loop o batch).
- **Riesgos:** Bajo.
- **Dependencias:** SPEC-09 (visibilidad sin-equipo) si se usa `team_id`-only.
- **Aceptación:** Asignar a equipo crea asignaciones para todos los atletas; cada uno las ve (SPEC-01).
- **Casos límite:** Equipo grande (paginación/batching); miembro que ya tiene esa asignación (last-write-wins).

## SPEC-09 — Visibilidad de asignación sin equipo
- **Problema:** `listCoachAssignments` filtra por `team_id`; asignación con `team_id=null` invisible para el coach.
- **Solución:** Consulta OR: `team_id` in (equipos) OR `coach = currentUser` OR `athlete = currentUser`.
- **Beneficios:** Coherencia; evita asignaciones fantasma.
- **Impacto técnico:** `program-assignments.ts:90`.
- **Riesgos:** Bajo.
- **Dependencias:** Ninguna.
- **Aceptación:** Asignación directa (sin equipo) aparece en "Assigned Programs".
- **Casos límite:** `team_id=null` + coach correcto.

## SPEC-10 — Corregir vínculo coach↔feedback
- **Problema:** Feedback usa `(user as any).coach_id` deprecado; tipo lo nombra `coach`; seed sigue escribiendo `coach_id`.
- **Solución:** Resolver coach del atleta vía `team_memberships` (coach/admin del equipo) o campo migrated; actualizar `WorkoutCompleteScreen` y `feedback.ts`.
- **Beneficios:** Feedback llega al coach correcto (habilita SPEC-02).
- **Impacto técnico:** `WorkoutCompleteScreen.tsx:260`, `feedback.ts`, posible migración de datos.
- **Riesgos:** Bajo-medio.
- **Dependencias:** SPEC-07.
- **Aceptación:** Feedback guarda coach resuelto correctamente; coach lo ve.
- **Casos límite:** Atleta en múltiples equipos (elegir coach primario); sin coach.

## SPEC-11 — PRs y progresión offline
- **Problema:** `personal_records` no en pull set → PRs vacíos offline; `useAnalytics` tiene código muerto que retorna `[]`.
- **Solución:** Añadir `personal_records` al pull set (o calcular PRs localmente desde `exercise_sets` ya en SQLite, como `useProgression`); remover código muerto en `useAnalytics`; wirear `ExerciseTimelineScreen` charts.
- **Beneficios:** Progresión disponible offline; gráficas vivas.
- **Impacto técnico:** `sync-engine.ts:30` pull set; `useAnalytics.ts:156`; `ExerciseTimelineScreen.tsx`.
- **Riesgos:** Bajo.
- **Dependencias:** SPEC-05.
- **Aceptación:** PRs y gráficas de evolución funcionan offline tras sync.
- **Casos límite:** Datos aún no sincronizados (estado vacío graceful).

## SPEC-12 — Filtros PocketBase parametrizados
- **Problema:** `program-assignments.ts:32,76`, `feedback.ts:53`, `team-invites.ts:36` usan template literals sin escape → inyección/crash.
- **Solución:** Usar API de filtros parametrizados de PocketBase (`pb.collection().getList({ filter: ..., params })`) o escapar IDs.
- **Beneficios:** Seguridad; robustez.
- **Impacto técnico:** 3 servicios.
- **Riesgos:** Bajo.
- **Dependencias:** Ninguna.
- **Aceptación:** IDs con caracteres especiales no rompen ni manipulan el filtro.
- **Casos límite:** `code` con comillas en invite.

## (Opcionales — fuera de roadmap core)
- **SPEC-25** Alta directa de atleta por coach (hoy solo invitación/equipo).
- **SPEC-26** Chat/mensajería bidireccional (colección + UI).
- **SPEC-27** Campo `energy` en wellness (modelo + UI + sync).
