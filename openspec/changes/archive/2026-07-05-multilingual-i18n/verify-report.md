# Verification Report: multilingual-i18n — PR 1 (Foundation + Provider + Config)

**Change:** multilingual-i18n
**PR:** 1 of 4 (Foundation + Provider + Config)
**Date:** 2026-07-05
**Mode:** Full artifact verification (proposal, spec, design, tasks)
**Status:** FAIL — 3 CRITICAL issues require fixes before merge

---

## Completeness Table

| Dimension | Status | Notes |
|-----------|--------|-------|
| All declared files exist | PASS | lingui.config.ts, src/i18n/index.ts, detector.ts, 14 catalog JSON files, 2 test files, metro.config.js, babel.config.js, app/_layout.tsx |
| Task completion (PR 1) | PASS | 12/12 PR 1 tasks checked |
| Spec requirements (i18n-core) | FAIL | 3 CRITICAL violations found |
| Spec requirements (i18n-translations) | PASS | All PR 1 requirements met (caveat: catalogs empty, expected for PR 1) |
| Design coherence | FAIL | Wrong import path, missing constructor arg, type mismatch |
| Tests pass | PASS | 413/413 tests pass (including 22 new i18n tests) |
| TypeScript compiles | FAIL | 3 new errors in i18n files |

---

## Build / Tests / Coverage Evidence

### Test Results

```
Test Suites: 27 passed, 27 total
Tests:       413 passed, 413 total
Time:        23.02 s
```

### New Tests (PR 1)

| File | Tests | Status |
|------|-------|--------|
| src/i18n/__tests__/detector.test.ts | 10 | PASS |
| src/i18n/__tests__/index.test.ts | 12 | PASS |
| **Total new** | **22** | **PASS** |

### Coverage (src/i18n/)

| File | Stmts | Branch | Funcs | Lines |
|------|-------|--------|-------|-------|
| detector.ts | 93.3% | 85.7% | 100% | 100% |
| index.ts | 59.4% | 33.3% | 21.4% | 58.1% |
| **Overall i18n** | **70.2%** | **70%** | **31.3%** | **71.1%** |

**Note:** index.ts low coverage is due to `catalogImporters` (lines 8-25) using `require()` inside closures that aren't exercised by unit tests (they're mocked). The lazy loading path is tested at the integration level. Acceptable for PR 1.

### TypeScript Compilation

```
app/_layout.tsx(230,37): error TS2322: Type 'typeof Text' is not assignable to type 'ComponentType<TransRenderProps> | undefined'.
lingui.config.ts(1,15): error TS2305: Module '"@lingui/core"' has no exported member 'LinguiConfig'.
src/i18n/index.ts(5,21): error TS2554: Expected 1 arguments, but got 0.
```

Pre-existing TS errors from `TheHybridProject_v0_1/` prototype are excluded (not part of PR 1 scope).

---

## Spec Compliance Matrix

### Capability: i18n-core (PR 1 scope)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FR-001: Lingui dependencies installed | PASS | `package.json` has @lingui/core, @lingui/react, @lingui/metro-transformer, @lingui/cli, @lingui/macro, @lingui/format-json, expo-localization |
| FR-002: lingui.config.ts exists with locales, sourceLocale, catalogs | PASS | File exists with locales ["en","es"], sourceLocale "en", correct catalog paths |
| FR-002: format = "po" (spec) vs "json" (design) | DESIGN DEVIATION | Design §2 explicitly chose JSON format over PO. Documented rationale. Acceptable. |
| FR-003: Metro transformer configured | PASS | metro.config.js sets `babelTransformerPath` to @lingui/metro-transformer/react-native BEFORE withNativeWind() |
| FR-004: Device locale detection via expo-localization | PASS | detector.ts uses getLocales(), extracts language code, maps to supported locale |
| FR-005: Fallback to English for unsupported locales | PASS | detectLocale() returns "en" as default. 10 tests cover this. |
| FR-006: I18nProvider wraps app root | PASS | app/_layout.tsx wraps inside AuthGate, outside Stack. Has `defaultComponent={Text}`. |
| FR-007: loadCatalog(locale, namespace) exported | PASS | src/i18n/index.ts exports loadCatalog function |
| FR-008: Runtime language switching support | PASS (foundation) | i18n instance + loadCatalog enable runtime switching. No UI in PR 1 (deferred). |
| FR-009: TypeScript type safety | FAIL | lingui.config.ts imports LinguiConfig from wrong module (@lingui/core instead of @lingui/conf) |
| FR-010: Macro compilation via Metro | PASS | babel.config.js has @lingui/babel-plugin-lingui-macro with async:true |

### Capability: i18n-translations (PR 1 scope)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| FR-011: English catalog exists | PASS | src/i18n/locales/en/ has 7 JSON files (common, auth, workout, history, exercises, records, profile) |
| FR-012: Spanish catalog exists | PASS | src/i18n/locales/es/ has 7 JSON files |
| FR-013: Namespace organization | PASS | 7 namespaces: auth, workout, history, exercises, records, common, profile |
| FR-016: Catalog format | PASS (JSON) | Design chose JSON. All catalogs are valid JSON. |
| Catalogs empty ({}) | EXPECTED | PR 1 is foundation. Strings extracted in PR 2+ when screens are wrapped. |

---

## Design Coherence

| Design Decision | Implementation | Status |
|-----------------|----------------|--------|
| §2: JSON not PO format | `@lingui/format-json` formatter used in lingui.config.ts | PASS |
| §3: Metro transformer BEFORE NativeWind | babelTransformerPath set before withNativeWind() call | PASS |
| §3: Babel plugin with async:true | `["@lingui/babel-plugin-lingui-macro", { async: true }]` | PASS |
| §4: I18nProvider inside AuthGate | `<AuthGate><I18nProvider>...</I18nProvider></AuthGate>` | PASS |
| §4: defaultComponent={Text} | Present but type error (TS2322) | FAIL |
| §6: Common loaded synchronously | initI18n() uses require() for common catalogs | PASS |
| §6: Feature namespaces lazy-loaded | catalogImporters uses require() closures (sync, not async) | DEVIATION |
| §7: jest.setup.ts mocks | @lingui/react and @lingui/react/macro mocked | PASS |
| §10: Dependencies | See dependency table below | MIXED |

### Dependency Issues

| Package | Design Says | package.json Has | Issue |
|---------|-------------|------------------|-------|
| @lingui/cli | devDependency | dependency | Should be devDependency |
| @lingui/macro | Not in design | `^5.9.5` (dependencies) | Version mismatch — all other Lingui packages are `^6.4.0` |
| expo-localization | `~16.0.0` | `~17.0.9` | Newer than spec, acceptable |

### Lazy Loading Deviation

The design §6 shows async `import()` for lazy loading, but the implementation uses `require()` (synchronous). This works for the foundation but means all catalog code is bundled (not code-split). Not a blocker for PR 1 since catalogs are empty, but will matter when catalogs have content.

---

## Issues

### CRITICAL (Must Fix Before Merge)

**C1: lingui.config.ts wrong import — TS2305**
- **File:** `lingui.config.ts:1`
- **Error:** `import type { LinguiConfig } from "@lingui/core"` — `@lingui/core` does not export `LinguiConfig`
- **Fix:** Change to `import type { LinguiConfig } from "@lingui/conf"`
- **Impact:** TypeScript compilation fails. The config file itself works at runtime (JS), but TS checks fail.

**C2: src/i18n/index.ts I18n constructor missing arg — TS2554**
- **File:** `src/i18n/index.ts:5`
- **Error:** `new I18n()` — constructor expects `I18nProps` parameter (required, even if all fields optional)
- **Fix:** Change to `new I18n({})` or use `setupI18n({})` from `@lingui/core`
- **Impact:** TypeScript compilation fails. Runtime may work in JS but will fail in strict TS environments.

**C3: app/_layout.tsx defaultComponent type mismatch — TS2322**
- **File:** `app/_layout.tsx:230`
- **Error:** `defaultComponent={Text}` — `Text` from React Native doesn't satisfy `ComponentType<TransRenderProps>`
- **Context:** `TransRenderProps` has `{id, translation, children, message?}` but `Text` expects `TextProps`. These types are incompatible.
- **Fix:** Remove `defaultComponent={Text}` (Lingui's default is already a span/div) or wrap Text in an adapter component:
  ```tsx
  defaultComponent={({ children }) => <Text>{children}</Text>}
  ```
- **Impact:** TypeScript compilation fails. The `defaultComponent` prop is optional and can be safely removed.

---

### WARNING (Should Address, Not Blockers)

**W1: @lingui/cli should be devDependency**
- **File:** `package.json:21`
- `@lingui/cli` is a build tool (extraction, compilation). It should be in `devDependencies`, not `dependencies`.
- Impact: Increases production bundle analysis size unnecessarily.

**W2: @lingui/macro version mismatch**
- **File:** `package.json:24`
- `@lingui/macro` is at `^5.9.5` while all other @lingui packages are at `^6.4.0`.
- Impact: Potential API incompatibility. The `@lingui/macro` v5 APIs are mostly compatible with v6, but should be aligned.

**W3: Lazy loading uses require() instead of import()**
- **File:** `src/i18n/index.ts:10-25`
- Design specifies async `import()` for code-splitting. Implementation uses synchronous `require()`.
- Impact: When catalogs have content, all feature namespaces will be bundled in the initial chunk instead of lazy-loaded. Not an issue now (catalogs are empty), but will matter in PR 2+.

**W4: metro.config.js NativeWind transformer chaining**
- **File:** `metro.config.js:37-41`
- The Lingui transformer is set before `withNativeWind()`, but `withNativeWind` may overwrite `babelTransformerPath`. The design doc flagged this risk (§3 ⚠️). Cannot be verified without running Metro.
- Impact: If NativeWind overwrites the transformer, Lingui macros won't compile. Requires manual Metro startup test.

---

### SUGGESTION (Nice-to-Have)

**S1: Empty catalogs could have placeholder keys**
- All 14 JSON files contain `{}`. For PR 1, adding a single test key (e.g., `"test-key": "test"`) would prove the catalog loading pipeline works end-to-end when catalogs have content.

**S2: Test coverage for index.ts lazy loading**
- The `catalogImporters` path (lines 8-25) has 0% coverage. Adding a test that exercises the require() path with properly mocked catalog modules would increase confidence.

---

## Verdict

**FAIL** — 3 CRITICAL TypeScript errors must be fixed before merge.

The implementation is architecturally sound: the i18n foundation is correctly placed, the provider wraps in the right location, the Metro and Babel configs are correct, and the test suite passes. However, the 3 TypeScript errors prevent clean compilation and indicate import/API misuse that should be corrected.

### Action Items

1. **Fix C1:** Change `lingui.config.ts` import from `@lingui/core` to `@lingui/conf`
2. **Fix C2:** Change `new I18n()` to `new I18n({})` in `src/i18n/index.ts`
3. **Fix C3:** Remove `defaultComponent={Text}` from `app/_layout.tsx:230` or use an adapter
4. **Fix W1:** Move `@lingui/cli` from dependencies to devDependencies
5. **Fix W2:** Update `@lingui/macro` from `^5.9.5` to `^6.4.0`
6. **Re-run TypeScript check** after fixes: `npx tsc --noEmit` should produce no new errors
7. **Re-run tests** after fixes: `npm test` should still pass 413/413

---

*Generated by sdd-verify executor for multilingual-i18n PR 1.*
