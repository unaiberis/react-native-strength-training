# Fase 4 — Oportunidades de mejora

Detectadas desde el código (no copiadas de la referencia). Agrupadas por tipo. Cada una apunta a un spec en `05-specifications.md`.

## Simplificación
- **Una sola fuente de rol.** Eliminar la dualidad `users.role` + `team_memberships.role` en navegación; derivar `effectiveCoach` solo de memberships (spec #7). Menos ramas, menos misrouting.
- **Un solo cómputo de PR.** Centralizar en `usePersonalRecords`; borrar el inline en `WorkoutCompleteScreen` y la etiqueta mal calculada en perfil (spec #23/#24).

## Automatización
- **Notificación automática en asignación.** Al `assignProgram`, crear `notifications` (o encolar) para el atleta → cierra el lazo sin pasos manuales (spec #3).
- **Sesiones programadas desde asignación.** Generar entradas de calendario/upcoming a partir de `start_date` + plantilla, en vez de solo un ledger (spec #1).
- **Backoff real en sync.** `await` del delay entre reintentos para no martillar el server (spec #21).

## Reducción de pasos
- **Asignación bulk a equipo.** "Asignar a todos los miembros" crea N `program_assignments` de una (spec #8). Hoy el label engaña.
- **Deep-link de notificación al workout.** `workout_assigned` → pantalla del programa/entrenamiento asignado, no al Train genérico (spec #15).

## Mejoras de UX
- Renderizar nombre real del equipo; arreglar edición que pisa el nombre (spec #13/#14).
- `WorkoutPreview` real desde la plantilla asignada (spec #18).
- Bodyweight persistido; RIR label consistente (spec #16/#17).
- Revivir gráficas de progresión (spec #12).

## Rendimiento
- **N+1 en `listAthletes`.** Agregación por atleta con queries por atleta; batchear (spec #11 implícito / nota).
- **PRs/wellness desde local.** Calcular PRs y wellness desde SQLite ya sincronizado en vez de PB live (spec #11/#4).

## Escalabilidad
- **Fan-out de equipo** y paginación en listas de atletas/asignaciones.
- **Pull set ampliado** para assignments/teams/memberships (spec #7).

## Mantenibilidad
- Borrar `permissions.ts` muerto o cablearlo (spec #6 / #20).
- Eliminar shim `useProgramAssignments`, `console.log` en `useTemplates` (spec #20).
- Parametrizar filtros PB (spec #19).

## Consistencia
- Unificar data source por feature: hoy wellness escribe PB / lee SQLite; PRs solo PB; progresión solo SQLite. Definir regla "escritura online + pull local" uniforme (spec #4/#11).
- Atletas y coaches comparten el mismo modelo de "programa asignado" (spec #1).

## Mejor arquitectura
- **Capa de consumo de asignaciones del atleta** (`useAthleteAssignments`) como contraparte de `useCoachAssignments`.
- **Servicio de notificaciones** (colección + hook alimentado) desacoplado de UI stub.
- **Enforcement de permisos en capa de servicios/UI** + reglas server en Admin UI.

## Mejores prácticas modernas
- Filtros PocketBase parametrizados (evitar inyección).
- Reglas de API server-side como fuente de autorización (zero-trust cliente).
- Sync con remap e índices correctos (`synced`, `dirty`, `logged_at`).
- Testing: cubrir el lazo cerrado con integration tests (assign → athlete sees → logs → feedback → coach sees).

## Deuda técnica señalada (fuera de specs directas)
- `patchPendingQueue` substring replacement (`id-mapping.ts:80-101`) puede corruptar IDs cortos/colisionados.
- `program_block_id` no en templates offline (pierde bloque al crear offline).
- Pull server-wins sin resolución de conflicto (local edits clobberdas).
- Sin password recovery UI pese a AGENTS.md.
- `(auth)/_layout` redirige con `setTimeout(0)` (workaround frágil).
