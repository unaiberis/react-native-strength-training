# Fase 3 — Comparativa funcional y técnica

Actual (A) vs Referencia cliente / buenas prácticas (R). Clasificación:
**CRÍTICA** (rompe el lazo coach↔atleta o corrompe datos), **IMPORTANTE** (brecha funcional grande),
**MEJORA UX**, **MEJORA TÉCNICA**, **OPCIONAL**.

| # | Área | Actual (A) | Referencia (R) | Diferencia | Clasificación |
|---|------|-----------|---------------|-----------|---------------|
| 1 | Consumo de asignaciones por atleta | `usePrograms` vacío, nunca lee `listAssignments` | Atleta ve programa asignado en Programs/Calendar | Coach push es **write-only**; atleta ciego a asignaciones | **CRÍTICA** |
| 2 | Feedback atleta→coach | `submitFeedback` escribe; `listFeedback` no usado en UI coach | Coach lee feedback del atleta | Feedback **write-only** para coach | **CRÍTICA** |
| 3 | Notificaciones | Hook stub vacío, `refetch` no-op, sin colección `notifications` | Coach asigna → atleta recibe notificación | Pipeline de notificaciones **inexistente** | **CRÍTICA** |
| 4 | Bienestar (wellness) | Loguea a PocketBase; dashboard lee SQLite vacío; offline perdido | Métricas de bienestar en home del atleta | **Rota E2E**; siempre vacío; offline perdido | **CRÍTICA** |
| 5 | Integridad de sync offline | 4 desajustes schema↔sync (feedback remap crash+duplicado, status, duration, logged_at) | Sync confiable online↔offline | Sync **corrompe/duplica** datos atleta offline→online | **CRÍTICA** |
| 6 | Permisos / authorization | `permissions.ts` never imported; solo enforcement server (Admin UI) | Roles enforced en UI y server | **Sin enforcement en cliente**; riesgo seguridad | **CRÍTICA** |
| 7 | Sync de assignments/teams/memberships | No están en pull set | Datos de relación disponibles offline | Coach/atleta ciegos offline a relaciones | **IMPORTANTE** |
| 8 | Asignación bulk a equipo | Label "a todos los miembros" pero solo 1 atleta | Asignar programa a todo el equipo | Fan-out no implementado | **IMPORTANTE** |
| 9 | Asignación sin equipo invisible | `listCoachAssignments` filtra por `team_id` | Toda asignación visible | Null-team assignment desaparece del coach | **IMPORTANTE** |
| 10 | Fuente de rol única | Global `role` + `team_memberships.role` (default silencioso a athlete) | Una sola fuente de verdad de rol | Dual source incoherente; misrouting | **IMPORTANTE** |
| 11 | PRs offline | `personal_records` no en pull set → vacío offline | PRs disponibles offline | PRs silenciosamente ausentes offline | **IMPORTANTE** |
| 12 | Analytics progresión | `useAnalytics.getExerciseProgress`/`getPersonalRecordTimeline` retornan `[]` | Gráficas de evolución temporal | Charts muertos en ExerciseTimeline | **IMPORTANTE** |
| 13 | Nombre de equipo en UI | Hardcode "Team", no muestra nombre real | Muestra nombre del equipo | **MEJORA UX** |
| 14 | Edición de equipo | `handleStartEdit` pisa nombre con `""` | Edición preserva nombre | **MEJORA UX** |
| 15 | Acción de notificación | `workout_assigned` → Train genérico, no al workout | Deep-link al workout asignado | **MEJORA UX** |
| 16 | Bodyweight en perfil | Editable en estado, "Future: persist to DB" | Persistido | **MEJORA UX** |
| 17 | Etiqueta RIR | UI dice "RIR (0–5)" pero valida 0–10 | Consistente | **MEJORA UX** |
| 18 | WorkoutPreview | Placeholder permanente | Preview del workout del coach | **MEJORA UX** |
| 19 | Filtros PocketBase | String-interpolation sin escape (`program-assignments.ts:32`) | Filtros parametrizados | Riesgo inyección/crash | **MEJORA TÉCNICA** |
| 20 | Código muerto | `permissions.ts` sin usar, shim `useProgramAssignments`, `console.log` en `useTemplates` | Sin dead code | **MEJORA TÉCNICA** |
| 21 | Backoff de sync | `getBackoffDelay` calculado pero nunca `await`ed | Backoff real entre reintentos | **MEJORA TÉCNICA** |
| 22 | Atomicidad de sync | `groupId` nunca seteado por offline services | Grupos atómicos usados | **MEJORA TÉCNICA** |
| 23 | Doble cómputo de PR | `usePersonalRecords` vs inline en `WorkoutCompleteScreen` | Una sola fuente de PR | **MEJORA TÉCNICA** |
| 24 | Etiqueta personalRecords en perfil | Cuenta ejercicios con set>0, no PRs reales | Etiqueta correcta | **MEJORA TÉCNICA** |
| 25 | Crear atleta por coach | Solo vía invitación/equipo (sin alta directa) | Alta directa opcional | **OPCIONAL** |
| 26 | Chat/mensajería | Inexistente | Comunicación bidireccional | **OPCIONAL** |
| 27 | Campo "energía" en wellness | Modelo tiene sleep/fatigue/soreness/mood, no energy | Métrica de bienestar completa | **OPCIONAL** |

## Resumen de impacto

- **6 críticas**: todas rompen el lazo cerrado coach↔atleta o corrompen datos.
- **6 importantes**: brechas funcionales y consistencia de rol/offline.
- **6 mejora UX**, **6 mejora técnica**, **3 opcionales**.

El patrón dominante: **el lado coach escribe, el lado atleta no consume** (asignaciones, feedback, notificaciones, bienestar). Esa es la deuda arquitectónica central que las Fases 4–7 atacan.
