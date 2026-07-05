# Design: Expo SDK 54 Upgrade

## Technical Approach

Upgrade from Expo SDK 52 (RN 0.76.6, React 18.3.1) to Expo SDK 54 (RN 0.81, React 19) in a single atomic step. The previous session (`ses_0e088e194ffe`) proved this upgrade works — 394 tests passed, TS clean. This design codifies that proven path as a reproducible procedure.

Core strategy: manual version edits → `npm install --legacy-peer-deps` → babel config rewrite → verify in order (TS → Jest → Expo export).

## Architecture Decisions

### Decision: NativeWind Babel Preset

**Choice**: Switch from inline css-interop plugins to `nativewind/babel` as a preset
**Alternatives considered**: Keep inline plugins with updated css-interop v0.2.6
**Rationale**: `nativewind/babel` preset is the official NativeWind 4.x path for RN 0.81+React 19. The inline approach was a workaround for RN 0.76 where the preset had unresolved worklet dependencies. RN 0.81 resolves this.

### Decision: react-native-worklets Extraction

**Choice**: Install `react-native-worklets@0.5.1` as standalone package
**Alternatives considered**: Bundle worklets inside reanimated, skip worklets entirely
**Rationale**: Reanimated 4.x extracted worklets to a separate package. Without it, the babel plugin fails. Previous session confirmed `react-native-worklets@0.5.1` is the correct peer.

### Decision: Peer Dep Resolution

**Choice**: Use `--legacy-peer-deps` for npm install
**Alternatives considered**: Force resolution overrides, use yarn/pnpm, manually patch peer deps
**Rationale**: Cross-major upgrades (React 18→19) produce transitive peer conflicts in expo-managed packages. `--legacy-peer-deps` is the Expo-recommended escape hatch and was validated in the previous session.

### Decision: tsconfig.json

**Choice**: Keep existing tsconfig.json unchanged; let `expo/tsconfig.base` handle React 19 types
**Alternatives considered**: Pin `@types/react` to 19.x manually, add `compilerOptions.paths` for new modules
**Rationale**: Expo SDK 54's tsconfig base includes React 19 type definitions. The existing `@types/react@~18.3.0` will be superseded by the version Expo pins. No manual override needed.

## Data Flow

```
package.json (version edits)
    │
    ▼
npm install --legacy-peer-deps ──→ node_modules/ (full reinstall)
    │
    ▼
babel.config.js (preset + plugin rewrite)
    │
    ├──→ npx tsc --noEmit         (TypeScript verification)
    ├──→ npx jest                 (Test suite verification)
    └──→ npx expo export          (Build verification)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Update all runtime + dev dependency versions |
| `babel.config.js` | Modify | Replace inline css-interop plugins with `nativewind/babel` preset; keep `react-native-reanimated/plugin` |
| `package-lock.json` | Regenerate | Full lockfile regeneration via npm install |
| `tsconfig.json` | No change | Expo SDK 54 base handles React 19 types |
| `jest.setup.ts` | No change | Mocks remain valid — react-native mock structure unchanged |
| `jest.config.js` | No change | Node testEnvironment remains valid |

## Dependency Version Map

### Runtime Dependencies

| Package | Current (SDK 52) | Target (SDK 54) | Notes |
|---------|-------------------|------------------|-------|
| `expo` | ~52.0.0 | ~54.0.0 | Core runtime |
| `react` | 18.3.1 | 19.0.0 | Major version bump |
| `react-dom` | 18.3.1 | 19.0.0 | Must match react |
| `react-native` | 0.76.6 | 0.81.x | SDK 54 pinned |
| `expo-router` | ~4.0.0 | ~5.0.0 | Breaking: new API surface |
| `expo-constants` | ~17.0.0 | ~18.0.0 | SDK-matched |
| `expo-linear-gradient` | ~15.0.8 | ~16.0.0 | SDK-matched |
| `expo-linking` | ~7.0.0 | ~7.0.0 | Check — may stay same |
| `expo-secure-store` | ~14.0.0 | ~15.0.0 | SDK-matched |
| `expo-splash-screen` | ~0.29.0 | ~0.30.0 | SDK-matched |
| `expo-sqlite` | ~15.1.4 | ~16.0.0 | SDK-matched |
| `expo-status-bar` | ~2.0.0 | ~2.0.0 | Check — may stay same |
| `react-native-reanimated` | ~3.16.1 | ~4.0.0 | Major: worklets extracted |
| `react-native-gesture-handler` | ~2.20.2 | ~2.24.0 | SDK-matched |
| `react-native-safe-area-context` | 4.12.0 | 5.x | SDK-matched |
| `react-native-screens` | ~4.4.0 | ~4.10.0 | SDK-matched |
| `react-native-web` | ~0.19.13 | ~0.19.13 | Check — web may stay same |
| `react-native-css-interop` | ^0.1.22 | ^0.2.6 | NativeWind peer |
| `nativewind` | ^4.0.0 | ^4.0.0 | Stays; peer dep changes |
| `tailwindcss` | ^3.4.0 | ^3.4.0 | Stays |

### New Dependencies

| Package | Version | Reason |
|---------|---------|--------|
| `react-native-worklets` | 0.5.1 | Extracted from Reanimated 4; required by babel plugin |

### Dev Dependencies

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `@types/react` | ~18.3.0 | ~19.0.0 | Must match React 19 |
| `jest-expo` | ~52.0.0 | ~54.0.0 | SDK-matched |
| `react-test-renderer` | ^18.3.1 | ^19.0.0 | Must match React |

### Unchanged Dependencies

These do NOT need version changes — they are framework-agnostic:
- `@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query-persist-client`
- `pocketbase`, `zod`, `zustand`, `uuid`
- `react-hook-form`
- `@react-native-community/netinfo`, `@react-navigation/native`
- `@testing-library/jest-native`, `@testing-library/react-native`
- `@types/jest`, `@types/uuid`, `jest`, `ts-jest`, `typescript`

## babel.config.js Changes

### Current (SDK 52)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      require("react-native-css-interop/dist/babel-plugin").default,
      ["@babel/plugin-transform-react-jsx", {
        runtime: "automatic",
        importSource: "react-native-css-interop",
      }],
      "react-native-reanimated/plugin",
    ],
  };
};
```

### Target (SDK 54)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-reanimated/plugin",
    ],
  };
};
```

**Changes explained:**
1. **Added** `"nativewind/babel"` as a second preset — replaces the two inline css-interop plugins
2. **Removed** `require("react-native-css-interop/dist/babel-plugin").default` — now handled by preset
3. **Removed** `@babel/plugin-transform-react-jsx` with `importSource: "react-native-css-interop"` — now handled by preset
4. **Kept** `"react-native-reanimated/plugin"` — still required, but now peers with react-native-worklets

## Upgrade Sequence

Execute in this exact order to minimize breakage:

1. **Branch**: Create `feat/expo-sdk-54-upgrade` from main
2. **Edit package.json**: Apply version map (all runtime + dev deps)
3. **Clean install**: `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
4. **Edit babel.config.js**: Apply preset + plugin changes
5. **Verify TypeScript**: `npx tsc --noEmit` — fix any type errors
6. **Verify Jest**: `npx jest` — ensure all tests pass (target ≥394)
7. **Verify Expo export**: `npx expo export` — ensure build completes
8. **Commit**: `feat: upgrade expo sdk 52 to sdk 54`

### Why this order matters

- Step 3 must follow step 2 exactly — partial version edits + npm install causes peer dep hell
- Step 5 before step 6 — TS errors surface before test failures; faster feedback loop
- Step 7 last — it's the heaviest check; skip if 5+6 fail

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | All 128+ existing tests | `npx jest` — no new tests needed; upgrade is a refactor |
| Type | TypeScript compilation | `npx tsc --noEmit` — catch React 19 type breaks |
| Build | Expo bundle generation | `npx expo export` — catch Metro/babel config issues |
| Integration | Expo Go smoke test | Manual: launch app, navigate tabs, check NativeWind styles |
| Animation | Reanimated worklets | Manual: rest timer, screen transitions, gesture interactions |

**No new test files needed.** This is a dependency upgrade, not a feature change. Existing tests validate correctness.

## Migration / Rollout

No data migration required. This is a pure dependency upgrade with no schema changes.

**Phased verification:**
1. CI green (TS + Jest) → merge to main
2. Manual Expo Go smoke test on Android → confirm no runtime crashes
3. Monitor for edge cases in animation/styling over 1-2 days

## Rollback Plan

1. `git checkout main -- package.json babel.config.js` — restore pre-upgrade files
2. `rm -rf node_modules package-lock.json && npm install` — reinstall SDK 52 deps
3. `npx tsc --noEmit && npx jest` — verify SDK 52 state restored
4. If already merged: revert the merge commit, force-push if needed

**RISK**: If other commits land on main between upgrade merge and rollback, manual conflict resolution required. Mitigate by keeping upgrade as a single atomic commit.

## Open Questions

- [ ] Exact SDK 54 pinned versions for `react-native`, `react-native-safe-area-context`, `react-native-screens` — need `npx expo install --fix` output after manual edits to confirm
- [ ] Whether `expo-router@5` has breaking API changes affecting `app/_layout.tsx` or route files — check changelog after install
- [ ] Whether `react-native-web@0.19.13` is compatible with RN 0.81 or needs upgrade — Expo may pin this
