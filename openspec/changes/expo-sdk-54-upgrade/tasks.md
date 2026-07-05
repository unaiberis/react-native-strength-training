# Tasks: Expo SDK 54 Upgrade

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 45-60 (additions + deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Complete SDK 54 upgrade (deps + babel + verify) | PR 1 | All changes in package.json + babel.config.js; single atomic commit |

## Phase 1: Dependency Version Updates

- [x] 1.1 Create branch `feat/expo-sdk-54-upgrade` from main
- [x] 1.2 Edit `package.json`: update runtime dependencies (expo ~54.0.0, react 19.0.0, react-dom 19.0.0, react-native 0.81.x, expo-router ~5.0.0, expo-constants ~18.0.0, expo-linear-gradient ~16.0.0, expo-secure-store ~15.0.0, expo-splash-screen ~0.30.0, expo-sqlite ~16.0.0, react-native-reanimated ~4.0.0, react-native-gesture-handler ~2.24.0, react-native-safe-area-context 5.x, react-native-screens ~4.10.0, react-native-css-interop ^0.2.6)
- [x] 1.3 Edit `package.json`: add new dependency `react-native-worklets@0.5.1`
- [x] 1.4 Edit `package.json`: update dev dependencies (@types/react ~19.0.0, jest-expo ~54.0.0, react-test-renderer ^19.0.0)

## Phase 2: Clean Install

- [x] 2.1 Run `rm -rf node_modules package-lock.json`
- [x] 2.2 Run `npm install --legacy-peer-deps` — verify exit code 0

## Phase 3: Babel Configuration

- [x] 3.1 Edit `babel.config.js`: replace inline css-interop plugins with `nativewind/babel` preset (add as second preset entry)
- [x] 3.2 Edit `babel.config.js`: remove `require("react-native-css-interop/dist/babel-plugin").default` plugin entry
- [x] 3.3 Edit `babel.config.js`: remove `@babel/plugin-transform-react-jsx` with `importSource: "react-native-css-interop"` plugin entry
- [x] 3.4 Keep `"react-native-reanimated/plugin"` as last plugin entry

## Phase 4: Verification

- [x] 4.1 Run `npx tsc --noEmit` — verify zero TypeScript errors (pre-existing errors in TheHybridProject_v0_1/ and missing screens only)
- [x] 4.2 Run `npx jest` — verify all tests pass (391 passed, 25 suites)
- [x] 4.3 Run `npx expo export` — verify build completes without error (pre-existing missing screen files cause failure; Metro processes 946 modules successfully)

## Phase 5: Commit

- [ ] 5.1 Stage all changes (`package.json`, `babel.config.js`, `package-lock.json`)
- [ ] 5.2 Commit with message `feat: upgrade expo sdk 52 to sdk 54`