# Proposal: Frontend Standards

## Intent

Elevate code quality, accessibility, error handling, and performance to 2026 best practices. Current state has no ESLint config, no a11y props on shared components, no error boundaries, and inconsistent memoization. This change closes those gaps incrementally via stacked PRs.

## Scope

### In Scope

- ESLint flat config (typescript-eslint strict-type-checked, react-native-a11y, import restrictions)
- Prettier + lint-staged pre-commit hooks
- Accessible shared UI components (Button, Input, Card, RestTimer)
- Screen-level ErrorBoundary component + root layout integration
- React.memo/getItemLayout on list hot paths
- Test improvements: accessibility queries, hook tests, UI component coverage

### Out of Scope

- expo-image migration (needs native module verification)
- Icon system replacement (separate effort)
- Sentry crash reporting (needs API keys)
- Major architectural changes (e.g., state management rewrite)
- Screen-by-screen accessibility audit beyond shared components

## Capabilities

### New Capabilities

None — pure tooling/config + component hardening. No spec-level behavior change.

### Modified Capabilities

None — existing specs unchanged. All improvements are implementation-level.

## Approach

Three stacked PRs, each autonomous, targeting main:

1. **PR 1 — Tooling**: ESLint flat config (strict-type-checked, a11y, no-restricted-imports), Prettier, lint-staged, husky. Fix all lint errors across existing codebase.
2. **PR 2 — Components + Error Handling**: Add accessibilityRole/Label/State to Button, Input, Card, RestTimer. Add ErrorBoundary component + wrap screen groups in `_layout.tsx`. Add React.memo + getItemLayout on FlatLists.
3. **PR 3 — Tests**: Add UI component tests (accessibility queries, interaction), add hook tests where missing, migrate testID usage to role/label queries where applicable.

## Affected Areas

| Area                              | Impact   | Description                                           |
| --------------------------------- | -------- | ----------------------------------------------------- |
| `eslint.config.mjs`               | New      | Flat config with TypeScript strict + a11y rules       |
| `.prettierrc`                     | New      | Prettier config                                       |
| `.husky/pre-commit`               | New      | lint-staged hook                                      |
| `src/shared/ui/*`                 | Modified | Accessibility props on Button, Input, Card, RestTimer |
| `src/shared/ui/ErrorBoundary.tsx` | New      | Screen-level error boundary                           |
| `app/_layout.tsx`                 | Modified | Wrap Stack groups in ErrorBoundary                    |
| `src/shared/ui/__tests__/*`       | New      | UI component tests                                    |
| ESLint fixes across `src/`        | Modified | Fix lint errors in existing code                      |

## Risks

| Risk                                  | Likelihood | Mitigation                                                      |
| ------------------------------------- | ---------- | --------------------------------------------------------------- |
| ESLint strict rules break CI          | Medium     | Run `tsc --noEmit && npx jest` first; fix in PR 1 before PR 2/3 |
| a11y props change visual rendering    | Low        | `accessibility*` props are RN-only, no visual impact            |
| ErrorBoundary catches expected errors | Low        | Use granular boundaries per screen group, not one global        |
| React.memo causes stale closures      | Low        | Focus on presentational list items only, wrap with ESLint rule  |

## Rollback Plan

PR-by-PR revert: `git revert <merge-commit>` per PR. ESLint config removal is zero-risk. Component a11y props removal reverts to current behavior. ErrorBoundary removal requires reverting `_layout.tsx`.

## Dependencies

- `eslint` v9.x, `prettier`, `husky`, `lint-staged`
- `eslint-plugin-react-native-a11y`
- `@eslint/eslintrc` + `@eslint/js` (flat config compat)
- No runtime dependencies — all dev tooling

## Success Criteria

- [ ] `npx eslint .` passes with strict-type-checked rules on full codebase
- [ ] `npx prettier --check .` passes
- [ ] `npx jest --coverage` passes (>80% per file)
- [ ] All shared UI components expose correct accessibility props (verified by tests)
- [ ] ErrorBoundary renders fallback UI when child throws
- [ ] FlatLists with >50 items use `getItemLayout`
- [ ] lint-staged blocks commits with lint or format errors
