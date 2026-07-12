# Fase 2 — Mapa del flujo de referencia (athlete-coach)

## Qué es la "referencia" en este entorno

No existe un repo separado `athlete-coach` ni un APK de ese nombre extraído. Los únicos artefactos de referencia presentes son:

1. **`TheHybridProject_v0_1/`** — prototipo Expo/RN del cliente (design system + shell). Es referencia de **diseño/UX**, no funcional: el dashboard de coach es un placeholder; el home del atleta tiene calendario semanal + tarjeta de entrenamiento + métricas de bienestar (sueño/energía/fatiga/racha).
2. **`AGENTS.md` → "Estructura Funcional — TheHybridProject"** — especificación funcional del cliente (WhatsApp images 2026-07-05) con flujos completos de atleta y entrenador. Esta es la referencia funcional "real".
3. **`BridgeAthletic_3.22.0_APKPure.apk`** — app de competidor; el proyecto actual ya apunta a "BridgeAthletic parity" (commit `c7727f7`). No extraído (requiere decompilar smali; fuera de alcance salvo que se pidiera como benchmark de competidor).

## Flujo de referencia (según AGENTS.md + TheHybridProject v0.1)

### Atleta
```
Login → Calendario semanal/mensual → Entrenamiento de hoy → Ver ejercicios
→ Registrar peso/reps/RIR/notas → Marcar completado → Enviar feedback
```
- Home: calendario semanal con dots de entrenamiento + "entrenamiento del día" + métricas de bienestar (sueño, energía, fatiga, racha).
- Historial, Evolución, Métricas de bienestar, Perfil.

### Entrenador
```
Login entrenador → Dashboard → Seleccionar atleta → Crear entrenamiento
→ Añadir ejercicios + vídeos → Configurar series/reps/RIR/descanso/notas
→ Asignar fecha → Atleta lo recibe en su calendario
```
- Dashboard, Lista de atletas, Perfil de atleta, Biblioteca de ejercicios, Analítica de atleta.
- **Asignación explícita:** "Asignar fecha → Atleta lo recibe en su calendario" → implica que la asignación del coach DEBE aparecer en el calendario/home del atleta. **Esto hoy NO ocurre en el proyecto actual.**

## Design tokens de referencia (TheHybridProject)
`background #050505`, `card #171719`, `border #343437`, `text #F4F4F2`, `textMuted #A4A4A8`, `titanium #B9B9B6`, radios 18–26px, pesos 800/700/500/600.

## Mapa de pantallas de referencia (TheHybridProject_v0_1, mínimo)
| Pantalla | Archivo | Contenido |
|----------|---------|-----------|
| Auth login | `app/(auth)/login.tsx` | Acceso inicial |
| Auth register | `app/(auth)/register.tsx` | Registro |
| Coach dashboard | `app/(coach)/dashboard.tsx` | **Placeholder** ("Aquí se gestionarán atletas, entrenamientos y evolución") |
| Athlete home | `app/(athlete)/home.tsx` | Calendario semanal + WorkoutCard + MetricCards (sueño/energía/fatiga/racha) |
| Components | `components/layout/Screen`, `cards/WorkoutCard`, `cards/MetricCard`, `buttons/PrimaryButton` | Sistema visual oscuro |

## Gap documentado en AGENTS.md (referencia vs actual)
| Módulo referencia | Estado actual | Gap |
|-------------------|---------------|-----|
| Asignar entrenamiento a atleta | 🟡 Asigna pero atleta no lo ve | **Flujo roto** |
| Feedback del atleta | 🟡 Escribe, coach no lee | **Write-only** |
| Métricas de bienestar | 🔴 Loguea a PB, lee de SQLite vacío | **Rota E2E** |
| Videos en ejercicios | ❌ `video_url` existe en librería pero no en flujo atleta | Parcial |
| Coach → Analítica de atleta | 🟢 Existe (derivada de sesiones) | OK |

## Conclusión de la referencia
La referencia funcional del cliente **exige** que la asignación del coach aparezca en el calendario/home del atleta y que el feedback del atleta llegue al coach. El proyecto actual tiene los cimientos (builder, asignación, sesión, feedback, analítica) pero **la mitad del lazo cerrado está sin cablear**. La referencia de diseño (tokens, cards, calendario semanal) ya está alineada con el actual.
