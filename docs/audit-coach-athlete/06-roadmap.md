# Fase 6 — Priorización y Roadmap

## Matriz de priorización

Valor 1–5 (5 = alto). Coste/Riesgo 1–5 (5 = peor). Orden sugerido por (VC+VA+UX) − Coste − Riesgo.

| Spec | VC | VA | UX | Coste | Riesgo | Score | Bucket |
|------|----|----|----|-------|-------|-------|--------|
| 01 Consumo asignaciones atleta | 5 | 5 | 5 | 2 | 2 | **11** | Alto impacto |
| 02 Lector feedback coach | 5 | 3 | 4 | 2 | 2 | **10** | Alto impacto |
| 03 Notificaciones backend | 4 | 5 | 5 | 3 | 3 | **8** | Alto impacto |
| 04 Wellness E2E | 2 | 5 | 4 | 3 | 3 | **5** | Alto impacto |
| 05 Sync integrity | 3 | 5 | 3 | 4 | 4 | **3** | Infra crítica |
| 06 Permisos enforcement | 4 | 2 | 2 | 2 | 3 | **5** | Quick Win |
| 07 Rol fuente única | 3 | 3 | 3 | 2 | 2 | **5** | Quick Win |
| 08 Asignación bulk equipo | 4 | 3 | 3 | 1 | 1 | **9** | Quick Win |
| 09 Visibilidad sin-equipo | 3 | 2 | 2 | 1 | 1 | **5** | Quick Win |
| 10 Vínculo coach↔feedback | 4 | 2 | 3 | 2 | 2 | **5** | Quick Win |
| 11 PRs/progresión offline | 2 | 4 | 4 | 2 | 1 | **7** | Quick Win |
| 12 Filtros PB parametrizados | 2 | 2 | 1 | 1 | 1 | **3** | Quick Win |

## Roadmap recomendado

### 🟢 Quick Wins (bajo coste/riesgo, siembra el terreno)
1. **SPEC-12** Filtros PB parametrizados — seguridad, sin riesgo.
2. **SPEC-09** Visibilidad asignación sin-equipo.
3. **SPEC-08** Asignación bulk a equipo.
4. **SPEC-07** Fuente de rol única — desbloquea 06/10.
5. **SPEC-10** Vínculo coach↔feedback — habilita 02.
6. **SPEC-06** Enforcement de permisos (reusa 07).
7. **SPEC-11** PRs/progresión offline + revivir analytics muerto.

### 🔵 Alto impacto (cierra el lazo coach↔atleta)
8. **SPEC-01** Consumo de asignaciones por el atleta. ← el gap central.
9. **SPEC-02** Lector de feedback para el coach.
10. **SPEC-03** Backend de notificaciones.
11. **SPEC-04** Plumbing de bienestar E2E.

### 🟠 Infra crítica (hacer con gate judgment-day; no tocar en paralelo a UI)
12. **SPEC-05** Integridad de sync offline→online. Base de 01–04 en modo offline.

### ⚪ Largo plazo / Opcionales
- **SPEC-25** Alta directa de atleta por coach.
- **SPEC-26** Chat/mensajería bidireccional.
- **SPEC-27** Campo `energy` en wellness.

## Secuencia recomendada (no en paralelo sobre sync-engine)
```
Quick Wins (12,9,8,7,10,6,11)
   → Alto impacto: 01 → 02 → 03 → 04
      → Infra crítica: 05  (judgment-day post-cambio)
         → Opcionales
```
Justificación: 05 es riesgo alto y toca `sync-engine`/`change-queue` (marcados CRÍTICO en AGENTS.md). Hacerlo DESPUÉS de que 01–04 estén cableados y testeados en online evita tener que debuguear dos frentes a la vez. 01 es el valor máximo y bajo riesgo → primero.

## Criterio de "done" por bucket
- Quick Wins: tests unitarios + lint + typecheck verde; sin regresión de rutas.
- Alto impacto: integration test del lazo cerrado (assign → athlete sees → logs → feedback → coach sees).
- Infra crítica: `npm test` + `judgment-day` (dual review ciego) obligatorio; coverage ≥80% en archivos tocados.
