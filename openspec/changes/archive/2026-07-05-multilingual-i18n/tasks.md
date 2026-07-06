# Tasks: Multilingual i18n with Lingui v6

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 850–1100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | 4 PRs (stacked-to-main) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Foundation + Provider + Config | PR 1 | New files only + minimal config changes (~200 lines). Sets up Lingui, metro, babel, i18n module. Zero feature changes. |
| 2 | Shared UI + Auth + Schemas | PR 2 | Modify 7 files. Shared components gain i18n props. Auth screens + Zod schemas wrapped. ~250 lines. |
| 3 | Feature Screens (workout, history, exercises, records, routines) | PR 3 | Wrap ~10 screen files. Bulk of string extraction. ~350 lines. |
| 4 | Navigation/Layout + Testing + Cleanup | PR 4 | Tab labels, header titles, sync banner, test wrapper, test updates. ~200 lines. |

---

## Phase 1: Foundation

- [x] 1.1 Install Lingui dependencies: `@lingui/core`, `@lingui/react`, `@lingui/macro`, `@lingui/cli`, `@lingui/metro-transformer`, `expo-localization`. Add `lingui extract` and `lingui compile` scripts to package.json. **Files:** `package.json`. **Depends on:** none. **Verify:** `npm ls @lingui/core` shows installed. **Est:** ~20 lines.
- [x] 1.2 Create `lingui.config.ts` at project root. Define `locales: ["en", "es"]`, `sourceLocale: "en"`, `format: "json"`, catalog paths at `src/i18n/locales/{locale}`, include `src/**/*.{ts,tsx}`, exclude tests. **Files:** `lingui.config.ts` (new). **Depends on:** 1.1. **Verify:** `npx lingui extract --dry-run` parses config without errors. **Est:** ~30 lines.
- [x] 1.3 Update `metro.config.js`: add `.po`/`.pot` to `sourceExts`, set `babelTransformerPath` to `@lingui/metro-transformer/react-native` BEFORE the `withNativeWind()` call. Chain transformers if NativeWind overwrites. **Files:** `metro.config.js`. **Depends on:** 1.1. **Verify:** `npx expo start` launches metro without transformer errors. **Est:** ~15 lines.
- [x] 1.4 Update `babel.config.js`: add `@lingui/babel-plugin-lingui-macro` plugin with `{ async: true }` to the plugins array (before reanimated). **Files:** `babel.config.js`. **Depends on:** 1.1. **Verify:** `npx babel src/features/auth/screens/LoginScreen.tsx` compiles macros without error. **Est:** ~5 lines.
- [x] 1.5 Create `src/i18n/detector.ts`: export `detectLocale()` that reads `expo-localization` `getLocales()`, extracts `languageTag`, maps to `"en"` or `"es"`, falls back to `"en"` for unsupported locales. **Files:** `src/i18n/detector.ts` (new). **Depends on:** 1.1. **Verify:** Unit test passes (mock `expo-localization`). **Est:** ~25 lines.
- [x] 1.6 Create `src/i18n/index.ts`: export `i18n` instance (`I18n` from `@lingui/core`), `init()` function that calls `detectLocale()`, loads common namespace synchronously, activates locale. Export `loadCatalog(locale, namespace)` for lazy feature loading. **Files:** `src/i18n/index.ts` (new). **Depends on:** 1.5. **Verify:** `init()` returns without error; `i18n.locale` is `"en"` or `"es"`. **Est:** ~55 lines.
- [x] 1.7 Create 7 empty English namespace JSON files: `src/i18n/locales/en/{common,auth,workout,history,exercises,records,profile}.json`. Each contains `{}` initially. **Files:** 7 new JSON files. **Depends on:** 1.2. **Verify:** Files exist; `lingui extract` can write to them. **Est:** ~14 lines (7 files × 2 lines).
- [x] 1.8 Create 7 empty Spanish namespace JSON files: `src/i18n/locales/es/{common,auth,workout,history,exercises,records,profile}.json`. Each contains `{}` initially. **Files:** 7 new JSON files. **Depends on:** 1.2. **Verify:** Files exist alongside English. **Est:** ~14 lines.
- [x] 1.9 Create `src/i18n/__tests__/detector.test.ts`: test `detectLocale()` for Spanish locale (`es-ES` → `"es"`), English locale (`en-US` → `"en"`), unsupported locale (`fr-FR` → `"en"` fallback), empty locales array. Mock `expo-localization`. **Files:** `src/i18n/__tests__/detector.test.ts` (new). **Depends on:** 1.5. **Verify:** `npx jest src/i18n` passes all 4 tests. **Est:** ~40 lines.

---

## Phase 2: Provider

- [x] 2.1 Wrap app in `I18nProvider` inside `app/_layout.tsx`. Import `I18nProvider` from `@lingui/react` and `i18n` from `@/i18n`. Place `<I18nProvider i18n={i18n}>` inside `AuthGate`, surrounding `<StatusBar>` and `<Stack>`. Call `init()` from `@/i18n` in a `useEffect` before first render. **Files:** `app/_layout.tsx`. **Depends on:** 1.6. **Verify:** App renders; `npx jest` passes; no console warnings. **Est:** ~15 lines changed.

---

## Phase 3: Shared UI Components

- [x] 3.1 Update `src/shared/ui/Button.tsx`: add `translatedTitle` optional prop. When provided, used instead of `title`. **Files:** `src/shared/ui/Button.tsx`. **Depends on:** 2.1. **Verify:** `npx tsc --noEmit` passes; existing callers unaffected. **Est:** ~5 lines changed.
- [x] 3.2 Update `src/shared/ui/Card.tsx`: add `translatedTitle` optional prop. **Files:** `src/shared/ui/Card.tsx`. **Depends on:** 2.1. **Verify:** `npx tsc --noEmit` passes. **Est:** ~5 lines changed.
- [x] 3.3 Update `src/shared/ui/Input.tsx`: add `translatedLabel` and `translatedError` optional props. **Files:** `src/shared/ui/Input.tsx`. **Depends on:** 2.1. **Verify:** `npx tsc --noEmit` passes. **Est:** ~8 lines changed.
- [x] 3.4 Update `src/shared/ui/StatCard.tsx`: add `translatedLabel` optional prop. **Files:** `src/shared/ui/StatCard.tsx`. **Depends on:** 2.1. **Verify:** `npx tsc --noEmit` passes. **Est:** ~5 lines changed.
- [x] 3.5 Update `src/shared/ui/RestTimer.tsx`: add `useLingui` hook, wrap "Rest between sets" and "Skip rest" with `t` macro. **Files:** `src/shared/ui/RestTimer.tsx`. **Depends on:** 2.1. **Verify:** Tests pass; `npx tsc --noEmit` passes. **Est:** ~10 lines changed.

---

## Phase 4: Auth Feature

- [x] 4.1 Wrap `src/features/auth/screens/LoginScreen.tsx` strings with Lingui macros. Import `useLingui` from `@lingui/react/macro`. Wrap all JSX text in `<Trans>`, all prop strings in `t\`...\``. Load `"auth"` namespace via `loadCatalog()`. **Files:** `src/features/auth/screens/LoginScreen.tsx`. **Depends on:** 2.1, 3.1. **Verify:** Screen renders in English; `npx jest` passes. **Est:** ~40 lines changed.
- [x] 4.2 Wrap `src/features/auth/screens/RegisterScreen.tsx` strings with Lingui macros. Same pattern as LoginScreen. Load `"auth"` namespace. **Files:** `src/features/auth/screens/RegisterScreen.tsx`. **Depends on:** 2.1, 3.1. **Verify:** Screen renders in English; `npx jest` passes. **Est:** ~50 lines changed.
- [x] 4.3 Convert `src/shared/schemas/auth.ts` to factory functions. Add `getLoginSchema()` and `getRegisterSchema()` with i18n messages. Keep legacy schemas for backward compat. **Files:** `src/shared/schemas/auth.ts`. **Depends on:** 1.6. **Verify:** `npx tsc --noEmit` passes; schema returns same structure. **Est:** ~40 lines changed.
- [x] 4.4 Update `src/shared/schemas/template.ts` with factory function `getWorkoutTemplateSchema()`. **Files:** `src/shared/schemas/template.ts`. **Depends on:** 1.6. **Verify:** `npx tsc --noEmit` passes; existing tests pass. **Est:** ~15 lines changed.

---

## Phase 5: Workout Feature

- [x] 5.1 Wrap `src/features/workout/screens/ActiveWorkoutScreen.tsx` strings with macros. Import `useLingui`, wrap ~30 JSX text strings in `<Trans>`, prop strings in `t\`...\``, Alert strings in `t\`...\``. Load `"workout"` namespace. Convert template literals to `t` tagged templates. **Files:** `src/features/workout/screens/ActiveWorkoutScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~80 lines changed.
- [x] 5.2 Wrap `src/features/workout/screens/WorkoutCompleteScreen.tsx` strings with macros. Same pattern. Load `"workout"` namespace. **Files:** `src/features/workout/screens/WorkoutCompleteScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~30 lines changed.
- [x] 5.3 Update workout store error messages: if any workout-related Zustand store has user-facing error strings (Alert.alert calls in hooks), wrap those with `t()` using `useLingui` in the hook that calls them. **Files:** workout hooks/store files. **Depends on:** 5.1. **Verify:** Error messages still display correctly. **Est:** ~15 lines changed.

---

## Phase 6: History Feature

- [x] 6.1 Wrap `src/features/history/screens/HistoryListScreen.tsx` strings with macros. Import `useLingui`, wrap text in `<Trans>`, props in `t`. Load `"history"` namespace. **Files:** `src/features/history/screens/HistoryListScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~35 lines changed.
- [x] 6.2 Wrap `src/features/history/screens/HistoryDetailScreen.tsx` strings with macros. Same pattern. **Files:** `src/features/history/screens/HistoryDetailScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~35 lines changed.

---

## Phase 7: Routines Feature

- [x] 7.1 Wrap `src/features/routines/screens/RoutineFormScreen.tsx` strings with macros (~25 strings). Import `useLingui`, wrap all user-facing text. Load `"workout"` namespace (shared with workout feature). **Files:** `src/features/routines/screens/RoutineFormScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~55 lines changed.
- [x] 7.2 Wrap `src/features/routines/screens/RoutineListScreen.tsx` strings with macros. Same pattern. **Files:** `src/features/routines/screens/RoutineListScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~25 lines changed.

---

## Phase 8: Exercises Feature

- [x] 8.1 Wrap `src/features/exercises/screens/ExerciseListScreen.tsx` strings with macros. Import `useLingui`, wrap text/props. Load `"exercises"` namespace. **Files:** `src/features/exercises/screens/ExerciseListScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~35 lines changed.
- [x] 8.2 Wrap `src/features/exercises/screens/ExerciseDetailScreen.tsx` strings with macros. Same pattern. **Files:** `src/features/exercises/screens/ExerciseDetailScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~35 lines changed.

---

## Phase 9: Records Feature

- [x] 9.1 Wrap `src/features/records/screens/ProgressScreen.tsx` strings with macros. Import `useLingui`, wrap chart labels, PR type labels, stats text. Load `"records"` namespace. **Files:** `src/features/records/screens/ProgressScreen.tsx`. **Depends on:** 2.1. **Verify:** Screen renders; `npx jest` passes. **Est:** ~35 lines changed.

---

## Phase 10: Navigation & Layout

- [x] 10.1 Translate tab labels in `app/(tabs)/_layout.tsx`. Import `useLingui` from `@lingui/react/macro`. Add `const { t } = useLingui()` in `TabsLayout`. Replace `title: "Home"` with `title: t\`Home\`` for all 5 visible tabs + 7 hidden route `headerTitle` strings. Add `t` to `SyncBanner` useMemo deps. **Files:** `app/(tabs)/_layout.tsx`. **Depends on:** 2.1. **Verify:** Tab bar shows translated labels; `npx jest` passes. **Est:** ~30 lines changed.
- [x] 10.2 Translate sync banner messages in `SyncBanner` component (inside `app/(tabs)/_layout.tsx`). Wrap each `text:` string with `t\`...\``. Add `t` as useMemo dependency. **Files:** `app/(tabs)/_layout.tsx`. **Depends on:** 10.1. **Verify:** Banner text translates on locale change. **Est:** ~12 lines changed.
- [x] 10.3 Translate header titles in `app/_layout.tsx` if any are hardcoded (currently `headerShown: false` on all screens, so minimal). Check for any hardcoded strings in the Stack.Screen options. **Files:** `app/_layout.tsx`. **Depends on:** 2.1. **Verify:** No hardcoded English strings remain in layout. **Est:** ~5 lines changed.

---

## Phase 11: Testing & Cleanup

- [x] 11.1 Create `src/shared/__tests__/test-utils.tsx`: export `TestWrapper` component that wraps children in `<I18nProvider>` with English catalog loaded. Initialize `i18n.load("en", commonEn)` and `i18n.activate("en")` at module level. **Files:** `src/shared/__tests__/test-utils.tsx` (new). **Depends on:** 1.6, 1.7. **Verify:** `TestWrapper` renders children without error. **Est:** ~25 lines.
- [x] 11.2 Add Lingui mock to `jest.setup.ts`. Mock `@lingui/react/macro` to export passthrough `Trans` and identity `useLingui`/`t`. **Files:** `jest.setup.ts`. **Depends on:** 1.1. **Verify:** `npx jest` passes existing tests unchanged. **Est:** ~15 lines.
- [x] 11.3 Update existing tests that render components now using `<Trans>` or `useLingui()`. Wrap those test renders with `TestWrapper`. Check each feature's `__tests__/` directory. **Files:** various `__tests__/*.test.tsx` files. **Depends on:** 11.1, 11.2. **Verify:** `npx jest --coverage` shows no regressions; all tests green. **Est:** ~40 lines across files.
- [x] 11.4 Run `npx lingui extract` to capture all wrapped strings into English catalog files. Verify all 7 namespace JSONs are populated. **Files:** `src/i18n/locales/en/*.json`. **Depends on:** all Phase 4–10 tasks. **Verify:** No errors; catalogs contain expected string counts. **Est:** ~0 lines (command only).
- [x] 11.5 Add Spanish translations to all 7 `src/i18n/locales/es/*.json` files. Translate every key from the English catalog. **Files:** 7 JSON files. **Depends on:** 11.4. **Verify:** `npx jest` passes; app renders Spanish UI when locale is `es`. **Est:** ~200 lines (translations).
- [x] 11.6 Add locale detection test: `src/i18n/__tests__/index.test.ts` — test `init()` sets `i18n.locale` correctly, `loadCatalog()` loads namespace, fallback works. **Files:** `src/i18n/__tests__/index.test.ts` (new). **Depends on:** 1.6. **Verify:** `npx jest src/i18n` passes. **Est:** ~40 lines.
- [x] 11.7 Final verification: run `npx tsc --noEmit`, `npx jest --coverage`, and `npm start` to confirm no type errors, all tests pass, metro bundler starts cleanly. Grep for remaining hardcoded user-facing strings in screen files. **Files:** none (audit). **Depends on:** all. **Verify:** Zero regressions; no unextracted strings found. **Est:** ~0 lines.

---

*Tasks created 2026-07-05 for the multilingual-i18n change.*
*Based on design phases 1–11 from design.md.*
