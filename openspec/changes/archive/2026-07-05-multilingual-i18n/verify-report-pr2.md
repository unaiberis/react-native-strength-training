# Verification Report: PR 2 — Shared UI Components + Auth Screens + Zod Schemas

**Change:** multilingual-i18n
**PR:** 2 of 4
**Date:** 2026-07-06
**Verifier:** sdd-verify executor

---

## Completeness Table

| Dimension | Status | Evidence |
|-----------|--------|----------|
| Tasks complete (PR 2) | ✅ 9/9 | All tasks 3.1-3.5, 4.1-4.4 checked |
| Spec conformance | ⚠️ PARTIAL | 2 missing catalog strings, spec deviation on key format |
| Design coherence | ✅ PASS | translated* prop pattern matches design §5 Pattern 2 |
| Tests pass | ✅ 427/427 | `npx jest --passWithNoTests` |
| TypeScript clean | ✅ 0 errors in src/ | `npx tsc --noEmit` (errors only in prototype dir) |

---

## Spec Compliance Matrix (PR 2 Requirements)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FR-020: Auth screen strings in `<Trans>` | ✅ PASS | LoginScreen, RegisterScreen use `<Trans>` and `t()` |
| FR-021: Zod validation uses translation keys | ⚠️ DEVIATION | Uses `i18n.t("English string")` instead of `t\`auth.validation.key\`` |
| FR-022: Auth error messages use translation keys | ⚠️ DEVIATION | Same as FR-021 |
| FR-023: Auth namespace catalog | ✅ PASS | en/auth.json, es/auth.json exist with 25 keys each |
| FR-024: Component text props | ✅ PASS | Button, Card, Input, StatCard accept translated* props |
| FR-025: RestTimer uses translation keys | ✅ PASS | `t\`Rest between sets\``, `t\`Skip rest\`` |
| FR-026: Common namespace catalog | ✅ PASS | en/common.json, es/common.json exist with 10 keys each |

---

## Build / Tests / Coverage Evidence

```
Tests:       427 passed, 427 total
Test Suites: 28 passed, 28 total
TypeScript:  0 errors in src/
```

Coverage for PR 2 files:
- `auth.ts` (schema): 100% statements, 100% branches
- `template.ts` (schema): 85.71% statements (getWorkoutTemplateSchema uncovered)
- `RestTimer.tsx`: 40% statements (component not rendered in tests)
- `LoginScreen.tsx`, `RegisterScreen.tsx`: 0% (no screen-level tests)
- `Button.tsx`, `Card.tsx`, `Input.tsx`, `StatCard.tsx`: 0% (no tests exist)

---

## Findings

### CRITICAL

#### C1: Missing catalog string — "Enter your password"

**File:** `src/i18n/locales/en/auth.json`, `src/i18n/locales/es/auth.json`
**Used in:** `LoginScreen.tsx` line 97: `placeholder={t\`Enter your password\`}`

The string `"Enter your password"` is passed through `t()` but does not exist in either English or Spanish auth catalogs. Lingui will return the raw key as fallback, so it renders in English — but this is a silent i18n failure. The Spanish user will see English text.

**Fix:** Add to both catalogs:
```json
// en/auth.json
"Enter your password": "Enter your password"

// es/auth.json
"Enter your password": "Ingresa tu contraseña"
```

#### C2: Missing catalog string — "At least 8 characters, 1 uppercase"

**File:** `src/i18n/locales/en/auth.json`, `src/i18n/locales/es/auth.json`
**Used in:** `RegisterScreen.tsx` line 118: `placeholder={t\`At least 8 characters, 1 uppercase\`}`

Same issue as C1. The placeholder string is used in `t()` but missing from catalogs.

**Fix:** Add to both catalogs:
```json
// en/auth.json
"At least 8 characters, 1 uppercase": "At least 8 characters, 1 uppercase"

// es/auth.json
"At least 8 characters, 1 uppercase": "Mínimo 8 caracteres, 1 mayúscula"
```

---

### WARNING

#### W1: No unit tests for Button, Card, Input, StatCard

**Files:** `src/shared/ui/Button.tsx`, `Card.tsx`, `Input.tsx`, `StatCard.tsx`

These components were modified to add `translatedTitle`, `translatedLabel`, and `translatedError` props, but no tests verify:
- The `translatedX ?? original` fallback behavior
- That components render correctly with and without translated props
- That the i18n prop override works

**Risk:** Regressions in the prop fallback pattern would go undetected.

#### W2: RestTimer test doesn't render the component

**File:** `src/shared/ui/__tests__/RestTimer.test.tsx`

The test file mocks `useLingui` and captures `t()` calls, but never actually renders `<RestTimer />`. It only tests:
- `formatRestTime()` function
- `useRestTimer()` hook return values
- That `RestTimer` is a function

The i18n strings `"Rest between sets"` and `"Skip rest"` are never verified to render correctly.

#### W3: getWorkoutTemplateSchema() has no test coverage

**File:** `src/shared/schemas/template.ts`

The factory function `getWorkoutTemplateSchema()` (lines 17-28) is never tested. The test file only covers the legacy `workoutTemplateSchema` and `templateExerciseSchema`. This means:
- i18n.t() integration in template validation messages is unverified
- Factory function freshness (each call returns new instance) is untested

#### W4: Legacy vs factory error message inconsistency

**File:** `src/shared/schemas/auth.ts`

- Legacy `loginSchema` line 43: `"Enter a valid email address"`
- Factory `getLoginSchema()` line 11: `i18n.t("Invalid email address")`

The same validation rule produces different error messages depending on which schema is used. This could confuse users if code paths mix legacy and factory schemas.

---

### SUGGESTION

#### S1: Spec deviation on Zod key format

**Spec FR-021** specifies namespaced translation keys:
```typescript
z.string().min(8, t`auth.validation.password-min`)
```

**Implementation** uses plain English strings:
```typescript
z.string().min(1, i18n.t("Email is required"))
```

This is **functionally correct** — Lingui's `i18n.t()` does key-based lookup, and the English strings serve as keys. The English catalog maps `"Email is required"` → `"Email is required"`, Spanish maps it → `"El correo electrónico es obligatorio"`.

However, it deviates from the spec's recommended pattern. Consider whether to:
1. Keep as-is (simpler, works correctly)
2. Migrate to namespaced keys for consistency with spec

#### S2: Unused catalog key — "Confirm password"

`"Confirm password"` exists in both auth.json catalogs but is not used in any screen (LoginScreen or RegisterScreen). This is dead weight — either remove it or it's预留 for a future password recovery screen.

#### S3: Spanish "Name is required" vs "Display name is required"

In `es/auth.json`:
- `"Name is required": "El nombre es obligatorio"`
- `"Display name is required": "El nombre es obligatorio"`

Both map to the same Spanish string. This is fine for UX but means the two English keys are indistinguishable in Spanish.

---

## Verdict

**PASS WITH WARNINGS**

PR 2 is functionally complete — all 9 tasks are done, all shared UI components accept translated props, auth screens use Lingui macros, Zod schemas use factory functions, legacy schemas are preserved, and all 427 tests pass.

However, **2 CRITICAL missing catalog strings** (C1, C2) mean two user-facing placeholders will silently fall back to English in Spanish mode. These must be fixed before merge.

The WARNING-level test gaps (W1-W4) don't block merge but should be addressed in PR 4 (Testing phase) per the task plan.

---

## Action Items

| # | Severity | Action | Blocks Merge? |
|---|----------|--------|---------------|
| C1 | CRITICAL | Add "Enter your password" to en/auth.json and es/auth.json | YES |
| C2 | CRITICAL | Add "At least 8 characters, 1 uppercase" to en/auth.json and es/auth.json | YES |
| W1 | WARNING | Add unit tests for Button, Card, Input, StatCard translated props | No (PR 4) |
| W2 | WARNING | Update RestTimer test to render component and verify i18n strings | No (PR 4) |
| W3 | WARNING | Add tests for getWorkoutTemplateSchema factory function | No (PR 4) |
| W4 | WARNING | Align legacy/factory email error messages in auth.ts | No |
| S1 | SUGGESTION | Decide on namespaced vs plain-English Zod keys | No |
| S2 | SUGGESTION | Remove unused "Confirm password" catalog key or document its purpose | No |
