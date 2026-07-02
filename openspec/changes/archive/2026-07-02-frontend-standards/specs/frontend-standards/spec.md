# Frontend Standards — Specification

## Purpose

Define tooling, accessibility, error handling, performance, and test requirements hardening the existing codebase without adding new user-facing capabilities. All improvements implementation-level; no spec-level behavioral changes.

## Requirements

### A. ESLint Flat Config

MUST use `eslint.config.mjs` with `@eslint/js` recommended (all files), `typescript-eslint` strict-type-checked (TS/TSX), `eslint-plugin-react-native-a11y` (TSX), and `no-restricted-imports` banning `src/features/` from importing sibling features (only `shared/`, `lib/`, `stores/`, `types/`).

#### Scenario: Lint passes clean code — GIVEN clean codebase WHEN `npx eslint .` THEN exit 0

#### Scenario: Cross-feature import flagged — GIVEN `features/exercises/` imports from `features/workout/` WHEN eslint runs THEN error

### B. Prettier + lint-staged + husky

Prettier: `.prettierrc` with `singleQuote`, `tabWidth: 2`, `trailingComma: "es5"`. lint-staged in `package.json`: `*.{ts,tsx,js,jsx,json,css,md}` → `prettier --write`, `eslint --fix`. husky: `.husky/pre-commit` runs `npx lint-staged`.

#### Scenario: Pre-commit blocks violations — GIVEN staged file with lint/format errors WHEN `git commit` THEN blocked

### C. Shared UI Accessibility

| Component | `accessibilityRole`     | `accessibilityState`                      | `accessibilityLabel`     |
| --------- | ----------------------- | ----------------------------------------- | ------------------------ |
| Button    | `"button"`              | `disabled:true` when `disabled`/`loading` | `title`                  |
| Input     | `"none"`                | —                                         | `label`                  |
| Card      | `"button"` if `onPress` | —                                         | `title` or children      |
| RestTimer | —                       | —                                         | Describes remaining time |

#### Scenario: Button loading state — GIVEN `loading={true}`, `title="Save"` THEN `accessibilityState.disabled=true`, `accessibilityLabel="Save"`

#### Scenario: Non-interactive Card — GIVEN no `onPress` THEN `accessible` not set, `accessibilityRole` absent

#### Scenario: Interactive Card — GIVEN `onPress` THEN `accessible=true`, `accessibilityRole="button"`

All `TouchableOpacity` in `app/` MUST have `accessibilityRole` and `accessibilityLabel`.

### D. ErrorBoundary

`ScreenErrorBoundary` MUST accept `screenName` prop, render fallback (error message + retry button) when child throws during render, wrap `(auth)` and `(tabs)` in `app/_layout.tsx`. MUST NOT catch event handler errors.

#### Scenario: Render crash — GIVEN child throws WHEN wrapped THEN fallback displayed

#### Scenario: Retry — GIVEN fallback WHEN tap "Retry" THEN boundary resets, children re-render

### E. Performance

`React.memo` wrapping: `Card`, `Button`, `RestTimer`, `ExerciseItem`, `SessionRow`, `RoutineItem`. `getItemLayout` on `FlatList` in `ExerciseListScreen`, `HistoryListScreen`, `RoutineListScreen` (heights: exercise 100px, history 120px, routine 100px). Handlers to memoized components MUST use `useCallback`.

### F. Tests

| File                        | What It Tests                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| `Button.test.tsx`           | Title, loading indicator, `accessibilityRole`/`label`/`state`                                |
| `Input.test.tsx`            | Label, error text, `accessibilityLabel` from `label`                                         |
| `Card.test.tsx`             | Children + title, accessible only when `onPress`                                             |
| `ErrorBoundary.test.tsx`    | Catch render error, fallback, retry recovers                                                 |
| `useWorkoutSession.test.ts` | `useCreateSession`, `useLogSet`, `useCompleteSession`, `useCancelSession` — online + offline |

#### Scenario: Button role query — GIVEN `title="Submit"`, `loading=false` WHEN `getByRole("button")` THEN found, `disabled=false`

#### Scenario: ErrorBoundary lifecycle — GIVEN child throws WHEN wrapped THEN fallback visible, "Retry" dismisses it

Coverage threshold: 80% per modified/new file.

## Acceptance Per Deliverable

| Deliverable            | Check                                                   |
| ---------------------- | ------------------------------------------------------- |
| ESLint config          | `npx eslint .` passes with `strict-type-checked`        |
| Prettier + lint-staged | `npx prettier --check .` passes; bad commits blocked    |
| Button a11y            | Tests verify `role`/`label`/`state`                     |
| Input a11y             | Tests verify `label`-derived `accessibilityLabel`       |
| Card a11y              | Tests verify `accessible` toggle with/without `onPress` |
| ErrorBoundary          | Tests verify catch + retry                              |
| getItemLayout          | Code review confirms each `FlatList`                    |
| Memo + useCallback     | Code review confirms wrapping                           |
