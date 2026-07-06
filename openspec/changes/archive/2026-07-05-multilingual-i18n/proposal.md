# Proposal: Multilingual i18n Support with Lingui v6

## Intent

The app has ~180+ hardcoded strings across 25+ files with inconsistent language usage (Spanish in auth screens, English everywhere else). This prevents internationalization, makes translation a manual nightmare, and creates a fragmented UX. We need a systematic i18n foundation using Lingui v6 to enable multi-language support.

## Scope

### In Scope
- Install and configure Lingui v6 (`@lingui/core`, `@lingui/react`, `@lingui/metro-transformer`, `@lingui/cli`)
- Create English base catalog with extracted strings
- Spanish translation catalog
- Wrap all hardcoded strings in `<Trans>` or `t()` macros
- Device locale detection via `expo-localization`
- Namespace-per-feature lazy loading (auth, workout, history, profile, exercises, records, common)
- Shared UI components (Button, Card, Input, RestTimer, StatCard) i18n-aware
- Zod validation messages as translation keys
- Header titles and tab labels in layouts
- Pluralization support via ICU MessageFormat

### Out of Scope
- RTL language support (Arabic, Hebrew) — no demand yet
- Translator tooling integration (Crowdin, Translation.io) — future
- Date/number formatting beyond basic — deferred
- Non-Latin script rendering tests — deferred
- Additional languages beyond en/es — future

## Capabilities

### New Capabilities
- `i18n-core`: Lingui setup, locale detection, catalog loading, provider integration, and macro configuration
- `i18n-translations`: Translation catalogs (en, es), string extraction workflow, and namespace loading

### Modified Capabilities
- `user-auth`: Validation messages in Zod schemas become translation keys
- `design-system`: Shared UI components accept i18n-aware text props
- `workout-execution`: Hardcoded screen strings wrapped in Trans macros
- `routine-builder`: Hardcoded screen strings wrapped in Trans macros
- `workout-history`: Hardcoded screen strings wrapped in Trans macros
- `exercise-library`: Hardcoded screen strings wrapped in Trans macros
- `personal-records`: Hardcoded screen strings wrapped in Trans macros

## Approach

1. **Phase 1 — Foundation**: Install Lingui deps, configure `lingui.config.ts`, add metro-transformer, create `src/i18n/` module with locale detection and catalog loading
2. **Phase 2 — Provider**: Wrap app in `<I18nProvider>`, add locale context/hook, wire `expo-localization`
3. **Phase 3 — Extract**: Run `lingui extract` to catalog all hardcoded strings, generate en catalog
4. **Phase 4 — Wrap**: Systematically replace hardcoded strings with `<Trans>` (JSX) and `t()` (functions) macros, file by file
5. **Phase 5 — Translate**: Create es catalog, translate all messages
6. **Phase 6 — Shared UI**: Update Button, Card, Input, RestTimer, StatCard with i18n props
7. **Phase 7 — Schemas**: Extract Zod validation messages to translation keys
8. **Phase 8 — Layouts**: Localize tab labels and header titles in `app/_layout.tsx` and `app/(tabs)/_layout.tsx`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/i18n/` | New | Locale detection, catalog loader, provider |
| `lingui.config.ts` | New | Lingui configuration (locales, catalogs, sources) |
| `app/_layout.tsx` | Modified | Wrap in I18nProvider, localize header titles |
| `app/(tabs)/_layout.tsx` | Modified | Localize tab labels |
| `src/shared/ui/*.tsx` (5 files) | Modified | i18n-aware text props |
| `src/shared/schemas/*.ts` (2 files) | Modified | Zod messages as translation keys |
| `src/features/*/screens/*.tsx` (~15 files) | Modified | Replace hardcoded strings with macros |
| `package.json` | Modified | Add Lingui dependencies |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| String extraction misses dynamic strings | Medium | Manual audit after `lingui extract`; add lint rule for unextracted patterns |
| Mixed Spanish/English cleanup creates regressions | Medium | All existing tests must pass; snapshot diff review |
| Metro transformer conflicts with NativeWind | Low | Test dev server early; Lingui docs document this combo |
| Performance impact from catalog loading | Low | Lazy-load per feature namespace; benchmark on low-end device |

## Rollback Plan

1. Revert all changes to source files (git checkout)
2. Remove `src/i18n/` directory
3. Remove `lingui.config.ts`
4. Remove Lingui packages from `package.json`
5. Run `npm install` to restore clean node_modules
6. Verify all tests pass with `npx jest`

## Dependencies

- `@lingui/core@^6`, `@lingui/react@^6`, `@lingui/metro-transformer@^6`, `@lingui/cli@^6`
- `expo-localization~16` (already compatible with Expo SDK 52)
- `lingui` dev dependency for CLI

## Success Criteria

- [ ] All 180+ hardcoded strings extracted to translation catalogs
- [ ] App renders correctly in English (default) and Spanish
- [ ] Device locale detection works (switches language automatically)
- [ ] All existing tests pass (`npx jest`)
- [ ] No console warnings related to missing translations
- [ ] `lingui extract` runs without errors
- [ ] Shared UI components accept i18n text props
- [ ] Zod validation messages display in correct language
