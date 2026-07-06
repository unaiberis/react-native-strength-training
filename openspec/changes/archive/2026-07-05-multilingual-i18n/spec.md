# Multilingual i18n Spec

## Purpose

Add internationalization (i18n) support using Lingui v6 to enable multi-language UI rendering. The app currently has ~180+ hardcoded strings across 25+ files with inconsistent language usage (Spanish in auth screens, English everywhere else). This spec defines the i18n foundation, translation catalogs, and integration across all feature modules.

## Scope

### New Capabilities
- **i18n-core**: Lingui setup, locale detection, catalog loading, provider, macros
- **i18n-translations**: Translation catalogs, extraction workflow, namespace loading

### Modified Capabilities
- **user-auth**: Auth screens i18n wrapping
- **design-system**: Shared UI components i18n support
- **workout-execution**: ActiveWorkoutScreen, WorkoutCompleteScreen i18n
- **routine-builder**: RoutineFormScreen, RoutineListScreen i18n
- **workout-history**: HistoryListScreen, HistoryDetailScreen i18n
- **exercise-library**: ExerciseListScreen, ExerciseDetailScreen i18n
- **personal-records**: ProgressScreen i18n

---

## Capability: i18n-core

### Purpose

Establish the Lingui v6 i18n foundation: locale detection, catalog loading, provider integration, and macro configuration.

### Requirements

#### FR-001: Lingui Dependencies
The app MUST install and configure `@lingui/core@^6`, `@lingui/react@^6`, `@lingui/metro-transformer@^6`, and `@lingui/cli@^6`.

#### FR-002: Lingui Configuration
A `lingui.config.ts` file MUST exist at project root defining:
- `locales`: `["en", "es"]`
- `sourceLocale`: `"en"`
- `catalogs`: paths for each locale catalog
- `format`: `"po"` (recommended for Lingui v6)

#### FR-003: Metro Transformer
The Metro bundler MUST be configured with `@lingui/metro-transformer` to enable macro compilation at build time.

#### FR-004: Device Locale Detection
The app MUST detect the device locale using `expo-localization` on startup. Detection MUST occur before the I18nProvider renders.

#### FR-005: Locale Fallback
If the detected locale is not in the supported list (`en`, `es`), the app MUST fall back to English (`en`).

#### FR-006: I18nProvider
The app root layout (`app/_layout.tsx`) MUST wrap the entire app in `<I18nProvider>` from `@lingui/react`.

#### FR-007: Catalog Loading
Catalogs MUST be loaded lazily per feature namespace. The `src/i18n/` module MUST export a `loadCatalog(locale, namespace)` function.

#### FR-008: Runtime Language Switching
The app MUST support changing the language at runtime (for testing/debugging). A `useI18n` hook MUST expose `locale`, `setLocale(locale)`, and `t()` function.

#### FR-009: TypeScript Type Safety
Lingui macros (`t()`, `<Trans>`) MUST be type-safe. The `lingui.config.ts` MUST generate TypeScript types for message catalogs.

#### FR-010: Macro Compilation
All Lingui macros (`t()`, `<Trans>`, `plural()`) MUST be compiled by the Metro transformer to runtime function calls. No raw macro imports in source.

### Scenarios

#### Scenario: Device locale is Spanish
- **GIVEN** device locale is `es-ES`
- **WHEN** app starts
- **THEN** `i18n.locale` is set to `"es"`, Spanish catalog loaded, UI renders in Spanish

#### Scenario: Device locale is English
- **GIVEN** device locale is `en-US`
- **WHEN** app starts
- **THEN** `i18n.locale` is set to `"en"`, English catalog loaded, UI renders in English

#### Scenario: Unsupported locale fallback
- **GIVEN** device locale is `fr-FR` (not supported)
- **WHEN** app starts
- **THEN** `i18n.locale` is set to `"en"` (fallback), English catalog loaded

#### Scenario: Runtime language switch
- **GIVEN** app is running in English
- **WHEN** developer calls `setLocale("es")`
- **THEN** Spanish catalog loads, UI re-renders in Spanish without app restart

#### Scenario: Catalog loading on demand
- **GIVEN** user navigates to workout screen
- **WHEN** workout namespace is needed
- **THEN** `loadCatalog("es", "workout")` is called, Spanish workout strings loaded

### Acceptance Criteria

- [ ] `lingui.config.ts` exists with correct locales and catalog paths
- [ ] Metro transformer compiles Lingui macros without errors
- [ ] `expo-localization` returns device locale on startup
- [ ] Fallback to English works for unsupported locales
- [ ] `<I18nProvider>` wraps the app root
- [ ] `useI18n()` hook returns locale, setLocale, and t()
- [ ] TypeScript compiles without macro-related errors
- [ ] No console warnings about missing translations in English

### Dependencies

- `@lingui/core@^6`
- `@lingui/react@^6`
- `@lingui/metro-transformer@^6`
- `@lingui/cli@^6`
- `expo-localization~16`

---

## Capability: i18n-translations

### Purpose

Manage translation catalogs for English and Spanish, define the extraction workflow, and implement namespace-based lazy loading.

### Requirements

#### FR-011: English Base Catalog
An English (`en`) catalog MUST exist at `src/i18n/locales/en/messages.po` containing all extracted user-facing strings.

#### FR-012: Spanish Translation Catalog
A Spanish (`es`) catalog MUST exist at `src/i18n/locales/es/messages.po` with translated messages for all extracted strings.

#### FR-013: Namespace Organization
Translations MUST be organized by feature namespace:
- `auth` — Login, Register, password recovery strings
- `workout` — Active workout, exercise sets, timer strings
- `history` — Workout history, session details
- `exercises` — Exercise library, categories, details
- `records` — Personal records, progress tracking
- `common` — Shared UI labels, buttons, errors
- `profile` — User profile, settings

#### FR-014: String Extraction
Running `lingui extract` MUST scan all `.tsx` and `.ts` files, extract strings wrapped in `<Trans>` or `t()` macros, and update the English catalog.

#### FR-015: Extraction Audit
After extraction, a manual audit MUST verify no hardcoded strings remain. A lint rule SHOULD be added to prevent new unextracted strings.

#### FR-016: Catalog Format
Catalogs MUST use PO (Portable Object) format with:
- `msgid` — the English source string (or message ID)
- `msgstr` — the translated string
- `msgctxt` — optional context for disambiguation

#### FR-017: Message IDs
For strings that should not be translated literally (brand names, technical terms), use explicit message IDs with `t` macro:
```typescript
t`brand-name` // Message ID used as key
```

#### FR-018: Pluralization
Plural messages MUST use ICU MessageFormat syntax via Lingui's `plural()` macro:
```typescript
t({
  id: "workout.sets",
  message: "{count, plural, one {# set} other {# sets}}"
})
```

#### FR-019: Context Messages
Strings with different translations based on context MUST use `msgctxt`:
```typescript
<Trans context="button label">Save</Trans>
<Trans context="form validation">Save</Trans>
```

### Scenarios

#### Scenario: Developer extracts new strings
- **GIVEN** developer adds a new `<Trans>` macro to a screen file
- **WHEN** `lingui extract` is run
- **THEN** the new string appears in `src/i18n/locales/en/messages.po`

#### Scenario: Spanish translation exists
- **GIVEN** English catalog has `"Log In"` string
- **WHEN** Spanish catalog is loaded
- **THEN** `"Iniciar sesión"` is displayed for Spanish locale

#### Scenario: Missing Spanish translation
- **GIVEN** English catalog has `"New Feature"` string
- **WHEN** Spanish catalog lacks translation for this string
- **THEN** English string is displayed as fallback

#### Scenario: Namespace loading
- **GIVEN** user is on workout screen
- **WHEN** workout strings are needed
- **THEN** only `workout` namespace catalog is loaded (not all catalogs)

### Acceptance Criteria

- [ ] English catalog exists with all ~180+ extracted strings
- [ ] Spanish catalog exists with translations for all strings
- [ ] `lingui extract` runs without errors
- [ ] Namespace directories exist: `auth/`, `workout/`, `history/`, `exercises/`, `records/`, `common/`, `profile/`
- [ ] PO format is valid and parseable
- [ ] Pluralization works correctly for count-based strings
- [ ] Missing translations fall back to English

### Dependencies

- i18n-core capability (Lingui setup, locale detection)

---

## Capability: user-auth (Modified)

### Purpose

Wrap hardcoded strings in auth screens (LoginScreen, RegisterScreen) with Lingui macros for i18n support.

### Requirements

#### FR-020: Auth Screen Strings
All user-facing strings in `LoginScreen.tsx` and `RegisterScreen.tsx` MUST be wrapped in `<Trans>` macros.

#### FR-021: Zod Validation Messages
Auth-related Zod schemas (`src/shared/schemas/auth.ts`) MUST use translation keys for validation messages:
```typescript
z.string().min(8, t`auth.validation.password-min`)
```

#### FR-022: Auth Error Messages
Authentication error messages (wrong password, user not found, etc.) MUST use translation keys.

#### FR-023: Auth Namespace
Auth translations MUST be in the `auth` namespace catalog.

### Scenarios

#### Scenario: Spanish login screen
- **GIVEN** locale is `es`
- **WHEN** user opens LoginScreen
- **THEN** all labels, buttons, and placeholders are in Spanish

#### Scenario: Validation error in Spanish
- **GIVEN** locale is `es`
- **WHEN** user submits login with short password
- **THEN** validation error shows Spanish message (e.g., "La contraseña debe tener al menos 8 caracteres")

### Acceptance Criteria

- [ ] All LoginScreen strings wrapped in `<Trans>`
- [ ] All RegisterScreen strings wrapped in `<Trans>`
- [ ] Zod auth schemas use `t()` for messages
- [ ] Auth namespace catalog contains all auth strings

### Dependencies

- i18n-core, i18n-translations
- Existing user-auth capability

---

## Capability: design-system (Modified)

### Purpose

Update shared UI components (Button, Card, Input, StatCard, RestTimer) to accept i18n-aware text props.

### Requirements

#### FR-024: Component Text Props
All shared UI components MUST accept text via props that can be pre-translated:
```typescript
<Button title={t`common.save`} onPress={onSave} />
```

#### FR-025: Component Labels
Components with static labels (e.g., RestTimer countdown) MUST use translation keys.

#### FR-026: Common Namespace
Shared UI translations MUST be in the `common` namespace catalog.

### Scenarios

#### Scenario: Button with translated label
- **GIVEN** locale is `es`
- **WHEN** `<Button title={t`common.save`} />` renders
- **THEN** button displays "Guardar"

#### Scenario: RestTimer with translated text
- **GIVEN** locale is `es`
- **WHEN** RestTimer renders
- **THEN** "Rest" text displays "Descanso"

### Acceptance Criteria

- [ ] Button accepts translated title prop
- [ ] Card accepts translated header/title props
- [ ] Input accepts translated placeholder prop
- [ ] StatCard accepts translated label prop
- [ ] RestTimer uses translation key for "Rest" label
- [ ] Common namespace catalog contains all shared UI strings

### Dependencies

- i18n-core, i18n-translations
- Existing design-system capability

---

## Capability: workout-execution (Modified)

### Purpose

Wrap hardcoded strings in ActiveWorkoutScreen and WorkoutCompleteScreen with Lingui macros.

### Requirements

#### FR-027: Workout Screen Strings
All user-facing strings in `ActiveWorkoutScreen.tsx` and `WorkoutCompleteScreen.tsx` MUST be wrapped in `<Trans>` or `t()` macros.

#### FR-028: Workout Namespace
Workout translations MUST be in the `workout` namespace catalog.

#### FR-029: Dynamic Workout Strings
Strings with dynamic values (set counts, weights, reps) MUST use Lingui's interpolation:
```typescript
<Trans>Set {setNumber} of {totalSets}</Trans>
```

### Scenarios

#### Scenario: Spanish active workout screen
- **GIVEN** locale is `es`
- **WHEN** user opens ActiveWorkoutScreen
- **THEN** all labels, buttons, and instructions are in Spanish

#### Scenario: Workout completion screen
- **GIVEN** locale is `es`
- **WHEN** workout is completed
- **THEN** completion message and stats are in Spanish

### Acceptance Criteria

- [ ] ActiveWorkoutScreen strings wrapped in macros
- [ ] WorkoutCompleteScreen strings wrapped in macros
- [ ] Workout namespace catalog contains all workout strings
- [ ] Dynamic interpolation works correctly

### Dependencies

- i18n-core, i18n-translations
- Existing workout-execution capability

---

## Capability: routine-builder (Modified)

### Purpose

Wrap hardcoded strings in RoutineFormScreen and RoutineListScreen with Lingui macros.

### Requirements

#### FR-030: Routine Builder Strings
All user-facing strings in `RoutineFormScreen.tsx` and `RoutineListScreen.tsx` MUST be wrapped in `<Trans>` or `t()` macros.

#### FR-031: Routine Namespace
Routine builder translations MUST be in the `workout` namespace catalog (shared with workout-execution).

### Scenarios

#### Scenario: Spanish routine form
- **GIVEN** locale is `es`
- **WHEN** user opens RoutineFormScreen
- **THEN** form labels, placeholders, and buttons are in Spanish

### Acceptance Criteria

- [ ] RoutineFormScreen strings wrapped in macros
- [ ] RoutineListScreen strings wrapped in macros
- [ ] All routine builder strings in workout namespace catalog

### Dependencies

- i18n-core, i18n-translations
- Existing routine-builder capability

---

## Capability: workout-history (Modified)

### Purpose

Wrap hardcoded strings in HistoryListScreen and HistoryDetailScreen with Lingui macros.

### Requirements

#### FR-032: History Screen Strings
All user-facing strings in `HistoryListScreen.tsx` and `HistoryDetailScreen.tsx` MUST be wrapped in `<Trans>` or `t()` macros.

#### FR-033: History Namespace
History translations MUST be in the `history` namespace catalog.

### Scenarios

#### Scenario: Spanish history list
- **GIVEN** locale is `es`
- **WHEN** user opens HistoryListScreen
- **THEN** list headers, empty states, and filters are in Spanish

### Acceptance Criteria

- [ ] HistoryListScreen strings wrapped in macros
- [ ] HistoryDetailScreen strings wrapped in macros
- [ ] History namespace catalog contains all history strings

### Dependencies

- i18n-core, i18n-translations
- Existing workout-history capability

---

## Capability: exercise-library (Modified)

### Purpose

Wrap hardcoded strings in ExerciseListScreen and ExerciseDetailScreen with Lingui macros.

### Requirements

#### FR-034: Exercise Library Strings
All user-facing strings in `ExerciseListScreen.tsx` and `ExerciseDetailScreen.tsx` MUST be wrapped in `<Trans>` or `t()` macros.

#### FR-035: Exercise Namespace
Exercise translations MUST be in the `exercises` namespace catalog.

### Scenarios

#### Scenario: Spanish exercise list
- **GIVEN** locale is `es`
- **WHEN** user opens ExerciseListScreen
- **THEN** category labels, search placeholders, and exercise names are in Spanish

### Acceptance Criteria

- [ ] ExerciseListScreen strings wrapped in macros
- [ ] ExerciseDetailScreen strings wrapped in macros
- [ ] Exercises namespace catalog contains all exercise strings

### Dependencies

- i18n-core, i18n-translations
- Existing exercise-library capability

---

## Capability: personal-records (Modified)

### Purpose

Wrap hardcoded strings in ProgressScreen with Lingui macros.

### Requirements

#### FR-036: Progress Screen Strings
All user-facing strings in `ProgressScreen.tsx` MUST be wrapped in `<Trans>` or `t()` macros.

#### FR-037: Records Namespace
Personal records translations MUST be in the `records` namespace catalog.

### Scenarios

#### Scenario: Spanish progress screen
- **GIVEN** locale is `es`
- **WHEN** user opens ProgressScreen
- **THEN** chart labels, record types, and stats are in Spanish

### Acceptance Criteria

- [ ] ProgressScreen strings wrapped in macros
- [ ] Records namespace catalog contains all PR strings

### Dependencies

- i18n-core, i18n-translations
- Existing personal-records capability

---

## Cross-Cutting Requirements

### FR-038: Tab Labels and Header Titles
Tab labels in `app/(tabs)/_layout.tsx` and header titles in `app/_layout.tsx` MUST use translation keys.

### FR-039: Layout Namespace
Layout translations (tab labels, headers) MUST be in the `common` namespace catalog.

### FR-040: No Console Warnings
The app MUST NOT produce console warnings about missing translations when running in English or Spanish.

### FR-041: Test Compatibility
All existing tests MUST pass after i18n integration. Tests that render components with `<Trans>` MUST be wrapped in `<I18nProvider>`.

### FR-042: Performance
Catalog loading MUST NOT cause noticeable UI lag. Lazy loading per namespace ensures only needed strings are loaded.

---

## Acceptance Criteria Summary

- [ ] All 180+ hardcoded strings extracted to translation catalogs
- [ ] App renders correctly in English (default) and Spanish
- [ ] Device locale detection works (switches language automatically)
- [ ] All existing tests pass (`npx jest`)
- [ ] No console warnings related to missing translations
- [ ] `lingui extract` runs without errors
- [ ] Shared UI components accept i18n text props
- [ ] Zod validation messages display in correct language
- [ ] Tab labels and header titles are translated
- [ ] Language can be changed at runtime
- [ ] TypeScript types ensure translation key consistency

---

## File Impact Summary

| File/Directory | Change Type | Description |
|----------------|-------------|-------------|
| `src/i18n/` | New | Locale detection, catalog loader, provider |
| `src/i18n/locales/en/messages.po` | New | English catalog |
| `src/i18n/locales/es/messages.po` | New | Spanish catalog |
| `lingui.config.ts` | New | Lingui configuration |
| `app/_layout.tsx` | Modified | Wrap in I18nProvider, localize headers |
| `app/(tabs)/_layout.tsx` | Modified | Localize tab labels |
| `src/shared/ui/*.tsx` | Modified | i18n-aware text props (5 files) |
| `src/shared/schemas/*.ts` | Modified | Zod messages as translation keys |
| `src/features/auth/screens/*.tsx` | Modified | Auth screen i18n |
| `src/features/workout/screens/*.tsx` | Modified | Workout screen i18n |
| `src/features/routine/screens/*.tsx` | Modified | Routine screen i18n |
| `src/features/history/screens/*.tsx` | Modified | History screen i18n |
| `src/features/exercises/screens/*.tsx` | Modified | Exercise screen i18n |
| `src/features/records/screens/*.tsx` | Modified | Records screen i18n |
| `package.json` | Modified | Add Lingui dependencies |
