# Proposal: Expo SDK 54 Upgrade

## Intent

Expo Go on Android requires SDK 54 compatibility. The project runs SDK 52 (React Native 0.76.6, React 18.3.1), which is incompatible. A previous upgrade attempt (session `ses_0e088e194ffe`) successfully upgraded and verified (394 tests passing, TS clean) but changes were reverted/not committed. This proposal re-executes the upgrade with known pitfalls resolved.

## Scope

### In Scope
- Upgrade core runtime: expo ~52→~54, react 18→19, react-dom 18→19, react-native 0.76→0.81
- Upgrade expo-router ~4→~5 and all expo-\* SDK-matched packages
- Upgrade react-native-reanimated ~3.16→4.x (with react-native-worklets extraction)
- Upgrade nativewind peer deps: react-native-css-interop ^0.1.22→^0.2.6
- Update babel.config.js for NativeWind preset + Reanimated plugin changes
- Verify: `npx tsc --noEmit`, `npx jest`, `npx expo export`

### Out of Scope
- Feature changes, new screens, or UI modifications
- PocketBase migration (independent concern)
- EAS build configuration
- Native module linking changes (expo modules handle this automatically)

## Capabilities

### New Capabilities
None

### Modified Capabilities
None (dependency upgrade — no spec-level behavior changes)

## Approach

1. **Manual version edits** in `package.json` — `npx expo install --fix` fails on cross-major upgrades due to npm strict peer deps. Use `npm install --legacy-peer-deps` after manual edits.
2. **NativeWind 4.x compatibility** — upgrade `react-native-css-interop` to ^0.2.6 and switch babel config to use `nativewind/babel` as a **preset** (not plugin) for RN 0.81 + React 19.
3. **Reanimated 4.x worklets** — install `react-native-worklets@0.5.1` (extracted from reanimated 4), remove duplicate babel plugin.
4. **Verify in order**: TypeScript → Jest → Expo export → manual Expo Go smoke test.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | All runtime + dev dependency versions |
| `babel.config.js` | Modified | NativeWind preset, Reanimated plugin, worklets plugin |
| `package-lock.json` | Modified | Full lockfile regeneration |
| `tsconfig.json` | Possibly Modified | React 19 type definitions may require `@types/react` update |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| NativeWind styles break on RN 0.81 + React 19 | Medium | Previous session proved `nativewind/babel` preset + css-interop ^0.2.6 works; apply same fix |
| Reanimated 4 babel plugin conflict | Medium | Install `react-native-worklets`, remove inline plugin |
| Peer dep resolution blocks npm install | High | Use `--legacy-peer-deps`; previous session confirmed this works |
| Third-party lib incompatibility with React 19 | Low | All deps are Expo-managed; verify with `npx expo install --check` |
| Tests break due to mock changes | Low | Previous session: 394 tests passed post-upgrade; same approach |

## Rollback Plan

1. `git stash` or `git checkout -- package.json babel.config.js` to restore pre-upgrade state
2. `rm -rf node_modules && npm install` to reinstall SDK 52 deps
3. Verify: `npx tsc --noEmit && npx jest` passes with original SDK 52

## Dependencies

- `npm` with `--legacy-peer-deps` support (npm 7+)
- Expo CLI (`npx expo install --check`) for post-upgrade validation

## Success Criteria

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npx jest` — all tests pass (target: ≥394, matching previous run)
- [ ] `npx expo export` completes without error
- [ ] App launches in Expo Go on Android without crash
- [ ] NativeWind styles render correctly (dark mode, spacing, colors)
- [ ] Reanimated animations function (rest timer, transitions)
