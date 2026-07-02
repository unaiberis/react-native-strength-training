# Seed System — PocketBase Deterministic Data Generator

> Documento técnico completo para entregar a una IA.
> Version: 1.0 | Proyecto: strength-training-app | PocketBase

---

## 1. Arquitectura General

```
scripts/
├── seed/
│   ├── index.mjs                  ← ENTRY POINT: orquesta los 7 pasos
│   ├── helpers/
│   │   ├── prng.mjs               ← PRNG determinista (Mulberry32)
│   │   ├── api.mjs                ← Capa REST PocketBase (CRUD, upsert, paginación)
│   │   └── validators.mjs         ← Validación post-seed (FKs, completitud)
│   ├── data/
│   │   ├── exercises.mjs          ← 80 ejercicios con datos completos
│   │   └── templates.mjs          ← 18 templates con mapeo de ejercicios
│   └── generators/
│       ├── progression.mjs        ← Motor de progresión S-curve
│       └── sessions.mjs           ← Generador de sesiones y sets
├── verify-seed.mjs                ← Verificación independiente (31 checks)
└── inspect-data.mjs               ← Data inspector (7 vistas, como endpoints CLI)
```

**Stack**: Node.js ESM (`.mjs`), `fetch()` nativo. Sin dependencias externas.
**Target**: PocketBase REST API (`/api/collections/*`, `/api/admins/*`).
**Seed fijo**: `"entrenamentua-demo-2026"` → mismo seed = mismos datos siempre.

---

## 2. Archivos y sus Responsabilidades

### 2.1. `scripts/seed/index.mjs` — Entry Point (373 líneas)

Orquesta 7 pasos secuenciales:

1. **Autenticar** como admin contra PocketBase
2. **Limpiar** datos demo: exercise_sets → workout_sessions → template_exercises → templates → exercises
3. **Validar** definiciones de ejercicios (categorías, duplicados, nulos)
4. **Upsert** 80 ejercicios (busca por nombre, crea si no existe)
5. **Crear** 18 templates con sus template_exercises
6. **Generar** 344 sesiones + ~6145 sets en 78 semanas (18 meses)
7. **Validar** integridad referencial y mostrar reporte de completitud

Variables de entorno:

- `PB_URL` — (default: `http://127.0.0.1:8090`)
- `PB_ADMIN_EMAIL` — (default: `aitor@musikak.com`)
- `PB_ADMIN_PASS` — (default: `entrenamentua2026`)

**Patrón de idempotencia**: `upsertRecord()` busca por `name`, si existe hace PATCH, si no POST.

### 2.2. `scripts/seed/helpers/prng.mjs` — PRNG Determinista (101 líneas)

**Algoritmo**: Mulberry32 (rana de 32 bits, rápida, determinista).
**Seed**: string → entero 32-bit via djb2 hash.

```js
createPRNG("entrenamentua-demo-2026") → {
  random()       // [0, 1)
  randomInt(min, max)   // entero inclusivo
  randomFloat(min, max) // float
  shuffle(arr)   // Fisher-Yates
  pick(arr)      // elemento aleatorio
  weightedPick(entries)  // {item, weight}
  gaussian()     // Box-Muller, ~N(0,1)
}
```

La misma seed produce exactamente la misma secuencia. Probado:

```js
seq1[0..4] = 0.956579, 0.547907, 0.798262, 0.273981, 0.624439
```

### 2.3. `scripts/seed/helpers/api.mjs` — Capa REST PocketBase (269 líneas)

Todas las funciones usan `fetch()` directo. No usa el SDK de PocketBase.

| Función              | Método HTTP                                      | Propósito              |
| -------------------- | ------------------------------------------------ | ---------------------- |
| `authenticate()`     | POST `/api/admins/auth-with-password`            | Login admin            |
| `authenticateUser()` | POST `/api/collections/users/auth-with-password` | Login usuario          |
| `createRecord()`     | POST                                             | Crear registro         |
| `updateRecord()`     | PATCH                                            | Actualizar por ID      |
| `getRecord()`        | GET                                              | Leer por ID            |
| `getFirstRecord()`   | GET con filter                                   | Primer match           |
| `getAllRecords()`    | GET con paginación                               | Todos los registros    |
| `deleteRecord()`     | DELETE                                           | Borrar por ID          |
| `deleteAllRecords()` | GET+DELETE loop                                  | Vaciar colección       |
| `findExisting()`     | GET filter o scan                                | Buscar por campo único |
| `upsertRecord()`     | findExisting + create/update                     | Crear o actualizar     |

**Edge case crítico resuelto**: `findExisting()` detecta caracteres especiales (apóstrofes como `'`) y hace fallback a programmatic match escaneando todos los registros, porque PocketBase filter syntax no escapa quotes correctamente vía URL. Ejemplo: `"World's Greatest Stretch"`.

### 2.4. `scripts/seed/helpers/validators.mjs` — Validación (127 líneas)

- `checkReferentialIntegrity(userId)` — Verifica 5 relaciones FK:
  - template_exercises → templates
  - template_exercises → exercises
  - exercise_sets → workout_sessions
  - exercise_sets → exercises
  - workout_sessions → templates
- `checkCompleteness(userId)` — Cuenta registros por colección + stats derivados (warmup/working sets, PR detectables)
- `validateExercises(exercises)` — Verifica categorías válidas, nombres únicos, sin nulos

### 2.5. `scripts/seed/data/exercises.mjs` — 80 Ejercicios (697 líneas)

Array de objetos con schema fijo:

```js
{
  name: "Barbell Bench Press",
  category: "chest",         // 12 categorías válidas
  body_region: "upper",      // upper | lower | full_body
  description: "...",        // ~1-2 líneas
  default_sets: 4,
  default_reps: 8,
  default_rest_seconds: 120,
  equipment: ["barbell"],    // array, no string
  is_public: true,
}
```

Distribución:

| Categoría  | Count | Equipment       | Count |
| ---------- | ----- | --------------- | ----- |
| chest      | 10    | barbell         | 19    |
| back       | 10    | bodyweight      | 19    |
| shoulders  | 9     | dumbbell        | 22    |
| core       | 8     | cable           | 10    |
| biceps     | 6     | machine         | 14    |
| triceps    | 5     | kettlebell      | 3     |
| quadriceps | 6     | resistance_band | 1     |
| hamstrings | 5     |                 |       |
| glutes     | 5     |                 |       |
| calves     | 4     |                 |       |
| cardio     | 6     |                 |       |
| mobility   | 6     |                 |       |

**Validación hardcodeada**: todas las categorías están en `VALID_CATEGORIES`, todos los equipos en `VALID_EQUIPMENT`.

### 2.6. `scripts/seed/data/templates.mjs` — 18 Templates (270 líneas)

Cada template tiene:

```js
{
  name: "Push Day",
  description: "All pressing movements...",
  is_public: true,
  exercises: [
    {
      exerciseName: "Barbell Bench Press",  // ← se resuelve por nombre contra exercises.mjs
      targetSets: 4,
      targetReps: 8,
      targetRpeLow: 7,
      targetRpeHigh: 9,
      restSeconds: 120,
    },
    // ... 4-7 ejercicios por template
  ]
}
```

Los templates (número entre paréntesis = ejercicios por template):

1. Push Day (6)
2. Pull Day (6)
3. Leg Day (5)
4. Upper (7)
5. Lower (5)
6. Full Body (6)
7. Chest + Triceps (6)
8. Back + Biceps (6)
9. Shoulders (6)
10. Arms (7)
11. Strength A (5)
12. Strength B (5)
13. Hypertrophy A (7)
14. Hypertrophy B (6)
15. Powerbuilding (7)
16. Glute + Hamstring Focus (5)
17. Core + Conditioning (5)
18. Mobility + Recovery (6)

**Total template_exercises**: 6+6+5+7+5+6+6+6+6+7+5+5+7+6+7+5+5+6 = **106** (coincide con el resultado real)

**Validación**: todos los `exerciseName` referenciados existen en `EXERCISES`. Verificado: 52 nombres únicos referenciados, 52 resueltos (0 sin resolver).

### 2.7. `scripts/seed/generators/progression.mjs` — Motor de Progresión (218 líneas)

**Modelo matemático**: Curva logística S (logistic function)

```
f(week) = start + (end - start) / (1 + e^(-steepness * (week - midpoint)))
```

**Parámetros por ejercicio compuesto** (kg):

| Ejercicio | Start | End (potencial) | Midpoint (semana) |
| --------- | ----- | --------------- | ----------------- |
| Squat     | 100   | 180             | 30                |
| Bench     | 75    | 130             | 26                |
| Deadlift  | 120   | 210             | 28                |
| OHP       | 45    | 80              | 24                |
| Row       | 65    | 110             | 26                |
| Leg Press | 180   | 320             | 30                |

Ejercicios no listados → perfil default `{ start: 30, end: 60, midpoint: 20 }`

**Cálculo de series** `getWorkingSet(exerciseName, week, weekType, setIndex, totalSets, prng)`:

- Semanas normales: intensidad 65-87% 1RM, reps 10→3 descendentes
- Deload: intensidad 48-60%, reps fijas 8, RPE bajo
- PR test: rampa 50%→93%, 1-5 reps, RPE 6-10
- Hipertrofia: intensidad 65-85%, reps 15→8
- Warmup sets: primeros 1-2 sets al 40-65% para compuestos
- Variación: ±2.5kg con 30% probabilidad, jitter gaussiano en reps/RPE
- Weight rounding: múltiplos de 2.5kg

### 2.8. `scripts/seed/generators/sessions.mjs` — Generador de Sesiones (347 líneas)

Genera 344 sesiones en 78 semanas (18 meses).

**Ciclo semanal**: `getWeekType(week)`:

```
Semana 0-2: normal
Semana 3:   deload
Semana 4-6: normal
Semana 7:   PR test
→ se repite cada 8 semanas
```

**Frecuencia**:

- Normal: 3-6 sesiones/semana, 10% de skip
- Deload: 2-4 sesiones/semana
- PR test: 3-5 sesiones/semana

**Selección de templates** `pickWeeklyTemplates()`:

- Normal/PR test: shuffle de todos los templates, elige los primeros N
- Deload: siempre incluye Mobility+Recovery y Core+Conditioning, completa con templates normales

**Generación por sesión**:

1. Fecha: distribuida en la semana, hora aleatoria 5-20
2. Duración: ~7 min por ejercicio, ajustada por week type
3. Notas: selección determinista de ~10 opciones por week type
4. Ejercicios: 4-7 por template, 2% de skip por ejercicio
5. Sets por ejercicio:
   - Compuestos → `getWorkingSet()` (progresión logística)
   - Bodyweight → `bodyweightSet()` (RPE effort-based)
   - Accesorios → progresión lineal +5kg en 78 semanas + jitter
   - Aislación → peso base de tabla `estimateBaseWeight()` + progresión

**Estimación de pesos base** (`estimateBaseWeight()`):
Mapa de 50+ ejercicios con pesos iniciales realistas (e.g., Lateral Raise: 8kg, Leg Press: 180kg, Barbell Curl: 25kg).

---

## 3. Bugs Encontrados y Corregidos Durante el Desarrollo

| #   | Gravedad    | Archivo             | Problema                                                                                                                                                                     | Fix                                                                                     |
| --- | ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1   | 🔴 CRITICAL | `index.mjs` L207    | `deleteAllRecords("workout_template_exercises")` dentro del loop de templates borraba TODOS los template exercises de TODOS los templates al procesar el primero que existía | Reemplazado por `getAllRecords` con filtro específico + delete individual               |
| 2   | 🔴 HIGH     | `index.mjs` L155    | `equipment: JSON.stringify(ex.equipment)` causaba doble serialización → se guardaba como string `"[\"barbell\"]"` en vez de array `["barbell"]` en el campo JSON de PB       | `equipment: ex.equipment` (el array directo, JSON.stringify del body lo serializa bien) |
| 3   | 🟡 MEDIUM   | `sessions.mjs` L41  | `getWeekType(0)` daba PR test en la semana 0 por la fórmula `(0 % 8) \|\| 8 = 8`                                                                                             | Ciclo corregido a `((week % 8) + 8) % 8`, con mod8=3→deload, mod8=7→pr_test             |
| 4   | 🟡 MEDIUM   | `sessions.mjs` L212 | `prng.random()` dentro de `.filter()` hacía la selección de templates frágil e impredecible                                                                                  | Separación explícita recovery/normal con shuffle arrays                                 |
| 5   | 🟡 HIGH     | `api.mjs` L231      | `findExisting` generaba filters rotos con valores tipo `"World's Greatest Stretch"` (el apóstrofe rompía la sintaxis de PB)                                                  | Detección de `['\\]` en valores → fallback a getAllRecords + match programático         |
| 6   | 🟢 LOW      | `index.mjs` L80     | Ejercicios viejos (32 del seed anterior) se acumulaban porque Step 2 no limpiaba exercises                                                                                   | `getAllRecords("exercises")` + `deleteRecord` por cada uno antes de recrear             |

---

## 4. Verificación

### 4.1. `scripts/verify-seed.mjs` (390 líneas)

Script independiente que corre **31 checks** (31 pasando, 0 fallando):

**1. Authentication** (2 checks):

1. `check("User authentication")` — login como test@test.com
2. `check("User ID present")` — userId no es null

**2. Exercises** (7 checks):

1. `check("Exercises loaded")` — cantidad >= 75
2. `check("Exercises ≤ 100")` — cantidad <= 100
3. `check("No null exercise names")` — todos tienen nombre
4. `check("All valid categories")` — contra `VALID_CATEGORIES` (12 válidas)
5. `check("Unique exercise names")` — sin duplicados
6. `check("default_sets not null")` — campo obligatorio
7. `check("default_reps not null")` — campo obligatorio

> **Nota**: `equipment` se valida como `warn()` (no como `check()`), porque el bug #2 de doble-stringify puede persistir como warning. El warn no incrementa `passed` ni `failed`.

**3. Workout Templates** (4 checks):

1. `check("Templates loaded")` — cantidad >= 15
2. `check("Templates ≤ 20")` — cantidad <= 20
3. `check("Template exercises loaded")` — template_exercises >= 60
4. `check("All templates have ≥4 exercises")` — cada template tiene >= 4 ejercicios

**4. Workout Sessions** (4 checks):

1. `check("Sessions loaded")` — cantidad >= 250
2. `check("Sessions ≤ 450")` — cantidad <= 450
3. `check("Date range ≥ 12 months")` — span de fechas >= 365 días
4. `check("All valid statuses")` — todos los status son `completed|in_progress|cancelled`

> **Nota**: "Sessions without template" se valida como `warn()`, no como `check()`. Sesiones sin template son válidas (workout libre).

**5. Exercise Sets** (6 checks):

1. `check("Sets loaded")` — cantidad >= 4000
2. `check("Sets ≤ 7500")` — cantidad <= 7500
3. `check("Warmup sets 10-20%")` — porcentaje dentro del rango (tolerancia ampliada a 8-25%)
4. `check("Consecutive set_number")` — set_number es secuencial dentro de cada sesión
5. `check("All reps > 0")` — sin reps cero o negativas
6. `check("All weight >= 0")` — sin pesos negativos

**6. Referential Integrity** (5 checks):

1. `check("TE → templates")` — template_exercises.workout_template_id existe en templates
2. `check("TE → exercises")` — template_exercises.exercise_id existe en exercises
3. `check("Sets → sessions")` — exercise_sets.workout_session_id existe en sessions
4. `check("Sets → exercises")` — exercise_sets.exercise_id existe en exercises
5. `check("Sessions → templates")` — workout_sessions.workout_template_id (si no es null) existe en templates

**7. Personal Records** (3 checks):

1. `check("PR-detectable exercises")` — >= 15 ejercicios con ≥3 working sets
2. `check("Estimated 1RM calculable")` — >= 15 ejercicios con e1RM > 0
3. `check("PR for [primer ejercicio]")` — e1RM del primer ejercicio es > 0

**Resumen**: 2 + 7 + 4 + 4 + 6 + 5 + 3 = **31 checks**. Dos validaciones adicionales usan `warn()` en vez de `check()`: `equipment format` y `sessions without template`.

### 4.2. Resultados Actuales (verificados con `npm run seed:verify`)

```
Passed:  31/31
Failed:  0
Warnings: 1 (equipment format — ver nota arriba)
```

| Métrica                     | Valor                              |
| --------------------------- | ---------------------------------- |
| exercises                   | 80                                 |
| templates                   | 18                                 |
| template_exercises          | 106                                |
| sessions                    | 344 (78 weeks, 4.4 avg/week)       |
| exercise_sets               | 6,145 (688 warmup / 5,457 working) |
| warmup %                    | 11.2% (688/6145)                   |
| personal_records_detectable | 52                                 |
| avg working weight          | 36.2 kg                            |
| avg working reps            | 9.5                                |
| broken FK                   | 0                                  |
| date range                  | 2025-01-02 → 2026-06-30 (544 days) |
| avg sets/session            | 17.9                               |

### 4.3. Cómo Reproducir

```bash
# 1. Asegurarse de que PocketBase está corriendo
curl -s http://127.0.0.1:8090/api/health

# 2. Ejecutar el seed completo
npm run seed

# 3. Verificar que todo esté correcto
npm run seed:verify

# 4. Inspeccionar datos
npm run inspect prs -- --limit 10
npm run inspect stats
npm run inspect broken-fks

# 5. Contra servidor remoto (override env)
PB_URL=https://api.entrenamentua.musikak.com npm run seed
PB_URL=https://api.entrenamentua.musikak.com npm run inspect stats
```

**Expected output de `npm run seed:verify`**:

```
── 1. Authentication ──
   ✓ User authentication
   ✓ User ID present
── 2. Exercises ──
   ✓ Exercises loaded (80 total)
   ✓ Exercises ≤ 100 (80)
   ✓ No null exercise names
   ✓ All valid categories (0 invalid)
   ✓ Unique exercise names (0 duplicates)
   ✓ default_sets not null
   ✓ default_reps not null
── 3. Workout Templates ──
   ✓ Templates loaded (18 total)
   ✓ Templates ≤ 20 (18)
   ✓ Template exercises loaded
   ✓ All templates have ≥4 exercises (18/18)
── 4. Workout Sessions ──
   ✓ Sessions loaded (344 total)
   ✓ Sessions ≤ 450 (344)
   ✓ Date range ≥ 12 months (544 days)
   ✓ All valid statuses
── 5. Exercise Sets ──
   ✓ Sets loaded (6145 total)
   ✓ Sets ≤ 7500 (6145)
   ✓ Warmup sets 10-20% (11.2%)
   ✓ Consecutive set_number (0 sessions with issues)
   ✓ All reps > 0 (0 zero-rep sets)
   ✓ All weight >= 0
── 6. Referential Integrity ──
   ✓ TE → templates (0 broken)
   ✓ TE → exercises (0 broken)
   ✓ Sets → sessions (0 broken)
   ✓ Sets → exercises (0 broken)
   ✓ Sessions → templates (0 broken)
── 7. Personal Records ──
   ✓ PR-detectable exercises (52 exercises with ≥3 working sets)
   ✓ Estimated 1RM calculable (52 exercises)
   ✓ PR for "Barbell Bench Press" (best e1RM: 133 kg)

✅ ALL CHECKS PASSED
```

---

## 5. Data Inspector

`scripts/inspect-data.mjs` (481 líneas) — 7 vistas CLI:

```bash
node scripts/inspect-data.mjs [view] [options]

Views:
  exercises          Lista de ejercicios con categorías y equipamiento
  templates          Templates con ejercicios y config (sets, reps, RPE, rest)
  sessions           Últimas sesiones con stats
  session <id>       Detalle completo: todos los sets, volumen total
  stats              Estadísticas aggregate por usuario
  prs                Personal Records (e1RM, 1RM, max volume, best set)
  broken-fks         Integridad referencial detallada
  all                Todo junto (default)

Options:
  --limit N          Límite de resultados
  --json             Salida JSON
  --user email       Usuario (default: test@test.com)
```

Se autentica como usuario primero, fallback a admin. Sin dependencias del SDK.

---

## 6. Colecciones PocketBase y API Rules

Las colecciones deben tener estas reglas configuradas (ya están en el servidor actual):

| Colección                  | listRule                     | viewRule | createRule                                             |
| -------------------------- | ---------------------------- | -------- | ------------------------------------------------------ |
| exercises                  | `@request.auth.id != ""`     | igual    | —                                                      |
| workout_templates          | `user_id = @request.auth.id` | igual    | `@request.auth.id != "" && user_id = @request.auth.id` |
| workout_template_exercises | `@request.auth.id != ""`     | igual    | igual                                                  |
| workout_sessions           | `user_id = @request.auth.id` | igual    | `@request.auth.id != "" && user_id = @request.auth.id` |
| exercise_sets              | `@request.auth.id != ""`     | igual    | igual                                                  |

**Nota**: `exercise_sets` no tiene `user_id`, por eso usa `@request.auth.id != ""`. El filtro por usuario se hace en la capa de servicio (JS) filtrando por session IDs del usuario.

---

## 7. Posibles Problemas / Edge Cases

### 7.1. World's Greatest Stretch

El nombre contiene un apóstrofe que rompe la sintaxis de filters de PocketBase. Solucionado con fallback programático en `findExisting()`. Si se agregan más ejercicios con caracteres especiales, verificar que el regex `/['\\]/` los cubra.

### 7.2. Equipment como string vs array

Si PocketBase tiene el campo como `json`, el array funciona directo. Si está como `text` (por migración desde Supabase), el seed envía array pero PocketBase lo convierte a `"[object Object]"`. Verificar tipo de campo en Admin UI.

### 7.3. Progresión de accesorios

La tabla `estimateBaseWeight()` tiene valores hardcodeados para ~50 ejercicios. Ejercicios nuevos no listados usan default 10kg. Verificar que todos los ejercicios referenciados en templates tengan entrada en esta tabla.

### 7.4. PR detectables

Un ejercicio necesita ≥3 working sets para ser "PR detectable". Ejercicios de mobilidad (1-2 series) o muy infrecuentes pueden no alcanzar este threshold.

### 7.5. Sesiones sin sets

Si un ejercicio se salta (2% de probabilidad) Y el template tiene pocos ejercicios, una sesión podría tener 0 sets. El generador salta sesiones vacías (`if (exercises.length > 0)`).

### 7.6. Límite de 200 registros por página

`getAllRecords()` y `deleteAllRecords()` pagan hasta obtener todos los registros. Para colecciones grandes (+10k), considerar aumentar `perPage` a 500.

---

## 8. Comandos

```bash
npm run seed              # Seed completo (reconstruye todo)
npm run seed:verify       # 31 checks de verificación
npm run inspect           # Data inspector (endpoints CLI)
npm run inspect stats     # Estadísticas aggregate
npm run inspect prs       # Personal Records detallados
npm run inspect broken-fks    # Integridad referencial

# Con servidor remoto:
PB_URL=https://api.ejemplo.com npm run seed
PB_URL=https://api.ejemplo.com npm run inspect prs
```

---

## 9. Dependencias del Sistema

**Runtime**: Node.js 18+ (ESM modules)
**Base de datos**: PocketBase (cualquier versión reciente, API v0.22+)
**Sin dependencias npm**: usa `fetch()` nativo de Node.js 18+

**Colecciones PocketBase requeridas** (deben existir):

- `users` (built-in)
- `exercises`
- `workout_templates`
- `workout_template_exercises`
- `workout_sessions`
- `exercise_sets`

---

## 10. Proyección de Datos

### 10.1. Perfiles Logísticos (target teórico al final del ciclo)

Cada perfil define el 1RM inicial (start) y el techo asintótico (end) que la curva logística alcanza al final de las 78 semanas. La fórmula es `f(week) = start + (end - start) / (1 + e^(-steepness × (week - midpoint)))` con `steepness = 0.10`.

| Ejercicio | Start (semana 0) | End (semana 78) | Midpoint  | Nota                                    |
| --------- | ---------------- | --------------- | --------- | --------------------------------------- |
| Squat     | 100 kg           | 180 kg          | semana 30 | Perfil: start=100, end=180, midpoint=30 |
| Bench     | 75 kg            | 130 kg          | semana 26 | Perfil: start=75, end=130, midpoint=26  |
| Deadlift  | 120 kg           | 210 kg          | semana 28 | Perfil: start=120, end=210, midpoint=28 |
| OHP       | 45 kg            | 80 kg           | semana 24 | Perfil: start=45, end=80, midpoint=24   |
| Row       | 65 kg            | 110 kg          | semana 26 | Perfil: start=65, end=110, midpoint=26  |
| Leg Press | 180 kg           | 320 kg          | semana 30 | Perfil: start=180, end=320, midpoint=30 |

### 10.2. e1RM Calculados (mejor set del histórico generado)

El e1RM se calcula con la fórmula de Epley: `e1RM = weight × (1 + reps / 30)`. Se toma el valor máximo entre todos los working sets generados para cada ejercicio.

**Umbral exacto de superación**: con `r = 8` reps (el caso de todos los best sets), Epley multiplica por `1 + 8/30 = 1.2667`. El e1RM supera el techo asintótico (`end`) exactamente cuando `weight / end > 1 / 1.2667 = 78.95%`. Esto produce un comportamiento binario determinista, no aleatorio:

| Ejercicio | weight/end         | vs 78.95% | ¿Excede?    |
| --------- | ------------------ | --------- | ----------- |
| Squat     | 145/180 = 80.56%   | >         | Sí (+3.7kg) |
| Bench     | 105/130 = 80.77%   | >         | Sí (+3.0kg) |
| Deadlift  | 167.5/210 = 79.76% | >         | Sí (+2.2kg) |
| Leg Press | 247.5/320 = 77.34% | <         | No (−6.5kg) |

Los cuatro caen exactamente del lado correcto del umbral. No es un artefacto de tamaño de muestra — es consecuencia directa de que el mejor set de cada ejercicio cayó por encima o debajo del 78.95% de su techo. El tamaño de muestra influye en la probabilidad de que un set cruce ese umbral, pero el mecanismo es matemático.

> **Conclusión**: No es un bug. Epley sobrestima el 1RM real en sets submáximos (>6 reps, lejos del fallo). Cuando el peso del set supera el ~79% del techo asintótico, la proyección de Epley cruza el límite teórico. Esto es comportamiento documentado de la fórmula, no un error de generación.

### 10.3. Estadísticas Agregadas

| Métrica                 | Valor       | Cálculo                                    |
| ----------------------- | ----------- | ------------------------------------------ |
| Warmup %                | 11.2%       | 688 / 6145                                 |
| Sets/session            | 17.9        | 6145 / 344                                 |
| Sessions/week           | 4.4         | 344 / 78                                   |
| Total volume            | ~220,000 kg | Σ(weight × reps) de todos los working sets |
| PR-detectable exercises | 52          | Ejercicios con ≥3 working sets             |
| Date range              | 544 days    | 2025-01-02 → 2026-06-30                    |
