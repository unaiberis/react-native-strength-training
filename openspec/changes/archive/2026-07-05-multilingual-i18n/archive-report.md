# Archive Report: Multilingual i18n Implementation

**Change**: `multilingual-i18n`
**Archived**: 2026-07-05
**SDD Cycle**: Complete

## Summary

| Field | Value |
|-------|-------|
| Proposal | ✅ Complete |
| Specs | ✅ 9 capabilities, 42 requirements |
| Design | ✅ 11 migration phases |
| Tasks | ✅ 42 tasks, all complete |
| Apply | ✅ 4 PRs stacked-to-main |
| Verify | ✅ All 4 PRs passed |

## Files Created

| File | Purpose |
|------|---------|
| lingui.config.ts | Lingui configuration (locales, catalogs, format) |
| src/i18n/index.ts | i18n instance + init + catalog loader |
| src/i18n/detector.ts | Device locale detection via expo-localization |
| src/i18n/locales/en/*.json | 7 English namespace catalogs (common, auth, workout, history, exercises, records, profile) |
| src/i18n/locales/es/*.json | 7 Spanish namespace catalogs |
| src/i18n/__tests__/detector.test.ts | Locale detection unit tests (10 tests) |
| src/i18n/__tests__/index.test.ts | i18n init + catalog loading tests (12 tests) |
| src/i18n/__tests__/locale-integration.test.ts | End-to-end locale integration test |
| src/shared/__tests__/test-utils.tsx | TestWrapper with I18nProvider for component tests |
| __mocks__/expo-localization.js | Jest mock for expo-localization |
| tsconfig.jest.json | JSX compilation config for Lingui macros in tests |

## Files Modified

| File | Changes |
|------|---------|
| metro.config.js | Lingui transformer added before NativeWind |
| babel.config.js | Lingui macro plugin added |
| app/_layout.tsx | I18nProvider wrapper + header title translations |
| app/(tabs)/_layout.tsx | Tab label translations + sync banner i18n |
| src/shared/ui/Button.tsx | `translatedTitle` prop added |
| src/shared/ui/Card.tsx | `translatedTitle` prop added |
| src/shared/ui/Input.tsx | `translatedLabel` + `translatedError` props |
| src/shared/ui/StatCard.tsx | `translatedLabel` prop added |
| src/shared/ui/RestTimer.tsx | useLingui + t macro for strings |
| src/shared/schemas/auth.ts | Factory functions with i18n (getLoginSchema, getRegisterSchema) |
| src/shared/schemas/template.ts | Factory function with i18n (getWorkoutTemplateSchema) |
| src/features/auth/screens/LoginScreen.tsx | Lingui macros (useLingui, t, Trans) |
| src/features/auth/screens/RegisterScreen.tsx | Lingui macros |
| src/features/workout/screens/ActiveWorkoutScreen.tsx | Lingui macros (~30 strings) |
| src/features/workout/screens/WorkoutCompleteScreen.tsx | Lingui macros |
| src/features/history/screens/HistoryListScreen.tsx | Lingui macros |
| src/features/history/screens/HistoryDetailScreen.tsx | Lingui macros |
| src/features/routines/screens/RoutineFormScreen.tsx | Lingui macros (~25 strings) |
| src/features/routines/screens/RoutineListScreen.tsx | Lingui macros |
| src/features/exercises/screens/ExerciseListScreen.tsx | Lingui macros |
| src/features/exercises/screens/ExerciseDetailScreen.tsx | Lingui macros |
| src/features/records/screens/ProgressScreen.tsx | Lingui macros |
| src/features/records/hooks/usePersonalRecords.ts | i18n.t() for PR type labels |
| src/features/profile/screens/ProfileScreen.tsx | Lingui macros |
| jest.setup.ts | Lingui mocks for Trans/useLingui/t |
| jest.config.js | ESM transform config for Lingui |
| package.json | Lingui dependencies + extract/compile scripts |

## Test Results

- Total tests: 450 (32 suites)
- New tests: 31 (i18n-specific: detector, index, locale-integration)
- All passing ✅
- No TypeScript errors in src/

## Verification Trail

| PR | Scope | Result | Key Findings |
|----|-------|--------|-------------|
| PR 1 | Foundation + Provider + Config | ✅ Passed (after fixes) | 3 CRITICAL TS errors found and fixed (wrong import, I18n constructor, defaultComponent type) |
| PR 2 | Shared UI + Auth + Schemas | ✅ Passed (after fixes) | 2 CRITICAL missing catalog strings found and fixed |
| PR 3 | Feature Screens (5 features) | ✅ Passed | 12/12 tasks verified, zero hardcoded strings |
| PR 4 | Navigation + Testing + Cleanup | ✅ Passed | ALL CHECKS PASS — 450/450 tests, 88 `<Trans>` usages, 7 namespaces consistent |

## Key Decisions

1. **Lingui v6 over i18next** — macros for compile-time extraction, CLI for workflow, smaller bundle
2. **JSON format over PO** — simpler Metro integration, native .json support
3. **Namespace per feature** — lazy loading via dynamic import(), code splitting per feature
4. **translated* props pattern** — backward compatible migration for shared UI components (Button, Card, Input, StatCard)
5. **Factory functions for Zod schemas** — runtime i18n for validation messages while preserving legacy schemas
6. **English strings as catalog keys** — simpler than abstract keys, self-documenting
7. **Stacked-to-main PRs** — 4 PRs to stay under 400-line review budget

## Lessons Learned

1. **Metro transformer order matters** — Lingui MUST come before NativeWind in metro.config.js or compilation fails silently
2. **Jest needs tsconfig.jest.json** — Lingui macros require `jsx: "react-jsx"` in test compilation, separate from main tsconfig
3. **`defaultComponent` needs adapter** — React Native `Text` component requires a type adapter for Lingui's `defaultComponent` prop
4. **Catalog keys = English strings** — self-documenting, easier to maintain than abstract keys like `auth.login.title`
5. **Run `lingui extract` as final step** — catches any missed strings that slipped through manual wrapping
6. **Shared UI needs backward compat** — `translatedX ?? original` pattern lets existing callers work without i18n
7. **Service error messages are acceptable as-is** — internal exception strings in pocketbase services don't need i18n
