# Technical Design: Multilingual i18n with Lingui v6

## 1. Architecture Overview

### Component Tree

```
AppRoot (app/_layout.tsx)
└── ForceDarkMode
    └── QueryClientProvider
        └── AuthGate
            └── I18nProvider          ← NEW: wraps entire app
                ├── Stack (expo-router)
                │   ├── (auth)/
                │   │   ├── LoginScreen
                │   │   └── RegisterScreen
                │   ├── (tabs)/
                │   │   ├── index (Home)
                │   │   ├── train
                │   │   ├── programs
                │   │   ├── progress
                │   │   └── profile
                │   └── (workout)/active
                └── StatusBar
```

### Data Flow

```
App Start
  │
  ├─► expo-localization detects device locale
  │     (e.g. "es-ES" → "es", "fr-FR" → "en" fallback)
  │
  ├─► src/i18n/index.ts initializes i18n instance
  │     ├─ i18n.load("en", commonCatalog)   // always loaded
  │     └─ i18n.activate(detectedLocale)
  │
  ├─► I18nProvider renders (receives i18n instance)
  │     └─ defaultComponent={Text} for React Native
  │
  └─► Feature screens load namespace catalogs on demand
        ├─ WorkoutScreen → loadCatalog("workout")
        ├─ AuthScreen → loadCatalog("auth")
        └─ etc.
```

### How Lingui Integrates with Expo SDK 54

Lingui v6 is framework-agnostic. Integration points:

1. **Metro Transformer** (`@lingui/metro-transformer`): Compiles `.po` catalogs to JS objects at build time. Transformer path is `@lingui/metro-transformer/react-native`. Plugs into `config.transformer.babelTransformerPath` BEFORE NativeWind's `withNativeWind` wrapper.

2. **Babel Plugin** (`@lingui/cli/babel-plugin`): Compiles `t()` and `<Trans>` macros into runtime function calls. Runs as part of `babel-preset-expo` pipeline.

3. **Runtime** (`@lingui/core` + `@lingui/react`): Provides `i18n` instance, `I18nProvider`, `Trans`, `useLingui` hook. Zero native modules — pure JS.

4. **TypeScript** (`@lingui/cli`): Generates type-safe message catalogs via `lingui extract --typescript`.

---

## 2. File Structure

```
src/
  i18n/
    index.ts                    # i18n instance, init(), loadCatalog()
    detector.ts                 # expo-localization wrapper
    locales/
      en/
        common.json             # shared UI labels, tab names, headers
        auth.json               # login, register, password recovery
        workout.json            # active workout, sets, exercises
        history.json            # workout history, session details
        exercises.json          # exercise library, categories
        records.json            # personal records, progress
        profile.json            # user profile, settings
      es/
        common.json
        auth.json
        workout.json
        history.json
        exercises.json
        records.json
        profile.json
```

### Why JSON (not PO)?

The spec recommends PO format, but JSON is chosen for this project because:

- **Metro native support**: `.json` is a built-in Metro source extension. No transformer needed for catalog loading — just `require()` or dynamic `import()`.
- **Simpler tooling**: No PO parser needed at runtime. Lingui v6 can load from JSON catalogs natively.
- **Smaller bundle**: JSON is smaller than PO for the same content.
- **Expo compatibility**: PO format requires the metro-transformer to compile at build time; JSON catalogs can be statically imported.

The `@lingui/metro-transformer` is still needed for compiling the `t()` and `<Trans>` macros — but catalog loading uses plain JSON.

---

## 3. Lingui Configuration

### `lingui.config.ts`

```typescript
import type { LinguiConfig } from "@lingui/core";

const config: LinguiConfig = {
  locales: ["en", "es"],
  sourceLocale: "en",
  catalogs: [
    {
      path: "src/i18n/locales/{locale}",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/node_modules/**", "**/__tests__/**", "**/*.test.*"],
    },
  ],
  format: "json",
  orderBy: "messageId",
  rootDir: ".",
  runtimeConfigModule: {
    i18n: ["@lingui/core", "i18n"],
  },
};

export default config;
```

**Key decisions:**
- `format: "json"` — JSON catalogs, not PO. See rationale in §2.
- `include: ["src/**/*.{ts,tsx}"]` — scans all source files for `t()` and `<Trans>` macros.
- `exclude` — skips test files (tests mock i18n anyway).
- `rootDir: "."` — project root.

### Metro Transformer Setup

The Metro config needs Lingui's transformer BEFORE NativeWind's `withNativeWind` wrapper. The order matters because Lingui's transformer compiles `.po` macros, and NativeWind processes CSS.

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Lingui: add .po/.pot source extensions (for catalog compilation)
config.resolver.sourceExts.push("po", "pot");

// Lingui: set babel transformer for macro compilation
config.transformer.babelTransformerPath = require.resolve(
  "@lingui/metro-transformer/react-native"
);

// Existing: ESM + resolution workarounds (unchanged)
config.resolver.sourceExts.push("mjs", "cjs");
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "@expo/metro-runtime/rsc/runtime": path.join(
    __dirname,
    "node_modules/@expo/metro-runtime/rsc/runtime.js"
  ),
  "@expo/metro-runtime/rsc/virtual": path.join(
    __dirname,
    "node_modules/@expo/metro-runtime/rsc/virtual.js"
  ),
};
config.resolver.extraNodeModules["expo-router/entry"] = path.join(
  __dirname,
  "node_modules/expo-router/entry.js"
);

// NativeWind wraps AFTER Lingui transformer
module.exports = withNativeWind(config, { input: "./global.css" });
```

**⚠️ Important**: `withNativeWind` wraps the entire config. The Lingui transformer must be set BEFORE this call. If NativeWind's wrapper overwrites `babelTransformerPath`, we need to chain them. This will be validated during Phase 1 implementation.

### Babel Plugin Configuration

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: [
      // Lingui macro plugin — compiles t(), <Trans>, plural() at build time
      ["@lingui/babel-plugin-lingui-macro", { async: true }],
      // Existing plugins (unchanged)
      require("react-native-css-interop/dist/babel-plugin").default,
      [
        "@babel/plugin-transform-react-jsx",
        {
          runtime: "automatic",
          importSource: "react-native-css-interop",
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
```

**Note**: The `async: true` option allows Lingui macros to resolve catalog imports asynchronously, which is needed for lazy namespace loading.

---

## 4. Provider Integration

### I18nProvider Placement

The `I18nProvider` wraps inside `AuthGate` but outside the router `Stack`. This ensures:

1. i18n is initialized before any screen renders
2. Auth loading states can use translated strings
3. The provider re-renders on locale change, updating the entire tree

```typescript
// app/_layout.tsx (modified)
import { I18nProvider } from "@lingui/react";
import { i18n } from "@/i18n";

export default function RootLayout() {
  return (
    <ForceDarkMode>
      <QueryClientProvider client={queryClient}>
        <AuthGate>
          <I18nProvider i18n={i18n}>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="(workout)/active"
                options={{ headerShown: false, presentation: "fullScreenModal" }}
              />
            </Stack>
          </I18nProvider>
        </AuthGate>
      </QueryClientProvider>
    </ForceDarkMode>
  );
}
```

### Integration with Expo Router

Expo Router renders screens as components inside the `Stack` or `Tabs`. Since `I18nProvider` is above the router, all screens have access to the i18n context. The `useLingui()` hook from `@lingui/react/macro` works in any component tree descendant of `I18nProvider`.

For tab labels and header titles (which are strings in `options`), we use the `t()` macro directly since they're evaluated at render time:

```typescript
// app/(tabs)/_layout.tsx
import { Trans, useLingui } from "@lingui/react/macro";

export default function TabsLayout() {
  const { t } = useLingui();
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: t`Home` }} />
      <Tabs.Screen name="train" options={{ title: t`Train` }} />
      <Tabs.Screen name="programs" options={{ title: t`Programs` }} />
      <Tabs.Screen name="progress" options={{ title: t`Progress` }} />
      <Tabs.Screen name="profile" options={{ title: t`Profile` }} />
    </Tabs>
  );
}
```

### Interaction with Zustand Stores

Zustand stores do NOT need direct i18n integration. The pattern is:

- **Store holds data, not display strings.** Stores store IDs, numbers, enums — not user-facing text.
- **Hooks translate at render time.** Feature hooks (e.g., `useWorkoutSession`) call `t()` when constructing display strings.
- **Alert.alert receives translated strings.** Components call `t()` when passing strings to `Alert.alert()`.

This keeps stores i18n-agnostic and testable without mocking i18n.

---

## 5. String Extraction Pattern

### Pattern 1: JSX Text Content

```typescript
// BEFORE
<Text>Hello World</Text>

// AFTER
<Text><Trans>Hello World</Trans></Text>
```

**Rule**: Wrap bare text content in `<Trans>`. The `<Trans>` component renders as a `Text` child via `defaultComponent`.

### Pattern 2: Component Props (title, label, placeholder)

```typescript
// BEFORE
<Button title="Save" />
<Input label="Email" placeholder="you@example.com" />
<Card title="Recent Workouts" />

// AFTER
import { useLingui } from "@lingui/react/macro";
const { t } = useLingui();

<Button title={t`Save`} />
<Input label={t`Email`} placeholder={t`you@example.com`} />
<Card title={t`Recent Workouts`} />
```

**Rule**: Use `t\`...\`` for props that accept `string`. The macro compiles to a function call.

### Pattern 3: Alert.alert and Alert Prompts

```typescript
// BEFORE
Alert.alert("Error", "Failed to log set");
Alert.alert("Finish Workout", "Mark this workout as complete?", [
  { text: "Cancel", style: "cancel" },
  { text: "Complete", onPress: handleComplete },
]);

// AFTER
Alert.alert(t`Error`, t`Failed to log set`);
Alert.alert(t`Finish Workout`, t`Mark this workout as complete?`, [
  { text: t`Cancel`, style: "cancel" },
  { text: t`Complete`, onPress: handleComplete },
]);
```

**Rule**: Wrap every string argument in `t()`.

### Pattern 4: Zod Validation Messages

```typescript
// BEFORE
import { z } from "zod";
export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// AFTER
import { z } from "zod";
import { t } from "@lingui/macro";

export const getLoginSchema = () => z.object({
  email: z.string().min(1, t`auth.validation.email-required`).email(t`auth.validation.email-invalid`),
  password: z.string().min(1, t`auth.validation.password-required`),
});
```

**Challenge**: Zod schemas are typically module-level constants. Using `t()` requires the schema to be generated at runtime (after i18n is initialized). Solution: export **factory functions** (`getLoginSchema()`) instead of constants. Callers invoke the factory when needed.

**Alternative (simpler)**: Keep schemas as constants with English keys, and translate at display time in the form hook:

```typescript
// Schema stays as-is with message keys
export const loginSchema = z.object({
  email: z.string().min(1, "auth.validation.email-required").email("auth.validation.email-invalid"),
  password: z.string().min(1, "auth.validation.password-required"),
});

// Form hook translates at display time
const errorMessage = t(errors.email?.message ?? "");
```

**Decision**: Use the **factory function approach** because it's cleaner and avoids string key indirection. The schema is generated once per locale change.

### Pattern 5: Dynamic / Template Strings

```typescript
// BEFORE
`Hello ${name}`
`Set ${setNumber} of ${totalSets}`
`Exercise ${currentIndex + 1} of ${exercises.length}`

// AFTER
t`Hello ${name}`
t`Set ${setNumber} of ${totalSets}`
t`Exercise ${currentIndex + 1} of ${exercises.length}`
```

**Rule**: Convert template literals to `t` tagged templates. Lingui handles interpolation.

### Pattern 6: Pluralization

```typescript
// BEFORE
`${count} set${count !== 1 ? "s" : ""}`

// AFTER
plural(count, {
  one: "# set",
  other: "# sets",
})
```

**Rule**: Use Lingui's `plural()` macro for count-based strings.

### Pattern 7: Conditional Strings

```typescript
// BEFORE
const status = isOnline ? "Online" : "Offline";

// AFTER
const status = isOnline ? t`Online` : t`Offline`;
```

### Pattern 8: SyncBanner (Computed Object)

```typescript
// BEFORE
const banner = useMemo(() => {
  if (!isOnline) return { text: "You're offline — changes sync when connected", ... };
  if (syncStatus === "syncing") return { text: "Syncing…", ... };
  // ...
}, [isOnline, syncStatus]);

// AFTER
const { t } = useLingui();
const banner = useMemo(() => {
  if (!isOnline) return { text: t`You're offline — changes sync when connected`, ... };
  if (syncStatus === "syncing") return { text: t`Syncing…`, ... };
  // ...
}, [isOnline, syncStatus, t]); // add t to deps
```

---

## 6. Namespace Strategy

### Namespace-to-Feature Mapping

| Namespace | Features Covered | Approximate String Count |
|-----------|-----------------|-------------------------|
| `common` | Tab labels, shared UI (Button, Card, Input, RestTimer, StatCard), header titles, sync banners, error fallbacks | ~25 |
| `auth` | LoginScreen, RegisterScreen, password recovery, validation messages | ~20 |
| `workout` | ActiveWorkoutScreen, WorkoutCompleteScreen, SetInputForm, exercise navigation | ~45 |
| `history` | HistoryListScreen, HistoryDetailScreen, empty states, filters | ~20 |
| `exercises` | ExerciseListScreen, ExerciseDetailScreen, search, categories | ~25 |
| `records` | ProgressScreen, chart labels, PR types, stats | ~20 |
| `profile` | ProfileScreen, settings, account management | ~15 |

### Default Loading

The `common` namespace is loaded synchronously at app startup because it's needed immediately (tab labels, header titles, loading states).

```typescript
// src/i18n/index.ts
import commonEn from "./locales/en/common.json";
import commonEs from "./locales/es/common.json";

// Always load common namespace
i18n.load({ en: commonEn, es: commonEs });
```

### Lazy Loading Pattern

Feature namespaces are loaded on-demand when the user navigates to that feature. This keeps the initial bundle small.

```typescript
// src/i18n/index.ts
const catalogs: Record<string, Record<string, () => Promise<Record<string, string>>>> = {
  en: {
    auth: () => import("./locales/en/auth.json"),
    workout: () => import("./locales/en/workout.json"),
    history: () => import("./locales/en/history.json"),
    exercises: () => import("./locales/en/exercises.json"),
    records: () => import("./locales/en/records.json"),
    profile: () => import("./locales/en/profile.json"),
  },
  es: {
    auth: () => import("./locales/es/auth.json"),
    workout: () => import("./locales/es/workout.json"),
    history: () => import("./locales/es/history.json"),
    exercises: () => import("./locales/es/exercises.json"),
    records: () => import("./locales/es/records.json"),
    profile: () => import("./locales/es/profile.json"),
  },
};

export async function loadCatalog(locale: string, namespace: string): Promise<void> {
  const loader = catalogs[locale]?.[namespace];
  if (!loader) return;

  const messages = await loader();
  i18n.load(locale, messages);
  // No need to call i18n.activate() — locale is already active
}
```

### Feature Hook Integration

Each feature screen's hook calls `loadCatalog()` at the top:

```typescript
// src/features/workout/hooks/useWorkoutSession.ts
import { useEffect } from "react";
import { useLingui } from "@lingui/react/macro";
import { loadCatalog } from "@/i18n";
import { useAuthStore } from "@/stores/auth-store";

export function useWorkoutSession() {
  const { i18n } = useLingui();
  const locale = useAuthStore((s) => s.locale) ?? i18n.locale;

  useEffect(() => {
    loadCatalog(locale, "workout");
  }, [locale]);

  // ... rest of hook
}
```

### Preloading Strategy

To avoid flash of untranslated content (FOOT), preload the next likely namespace:

```typescript
// In TabsLayout — preload common namespaces when tabs mount
useEffect(() => {
  const locale = i18n.locale;
  // Preload namespaces likely needed soon
  Promise.all([
    loadCatalog(locale, "workout"),
    loadCatalog(locale, "exercises"),
  ]);
}, []);
```

---

## 7. Testing Strategy

### Test Wrapper Pattern

Every test that renders components using `<Trans>` or `useLingui()` must wrap in `<I18nProvider>`:

```typescript
// src/shared/__tests__/test-utils.tsx
import { type ReactNode } from "react";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import commonEn from "../i18n/locales/en/common.json";

// Load English catalog for tests
i18n.load("en", commonEn);
i18n.activate("en");

export function TestWrapper({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
}
```

### Usage in Tests

```typescript
// src/features/auth/screens/__tests__/LoginScreen.test.tsx
import { render, screen } from "@testing-library/react-native";
import { TestWrapper } from "@/shared/__tests__/test-utils";
import { LoginScreen } from "../LoginScreen";

// Mock useAuth hook
jest.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ login: jest.fn() }),
}));

describe("LoginScreen", () => {
  it("renders login form in English", () => {
    render(<LoginScreen />, { wrapper: TestWrapper });

    expect(screen.getByText("Log In")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Password")).toBeTruthy();
  });
});
```

### Mock Pattern for Lingui

For unit tests that don't need full i18n rendering, mock the macro:

```typescript
// jest.setup.ts — add global mock
jest.mock("@lingui/react/macro", () => ({
  Trans: ({ children }: { children: React.ReactNode }) => children,
  useLingui: () => ({
    t: (strings: TemplateStringsArray, ...values: any[]) =>
      strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), ""),
  }),
}));
```

### Locale Detection Test

```typescript
// src/i18n/__tests__/detector.test.ts
import * as Localization from "expo-localization";
import { detectLocale } from "../detector";

jest.mock("expo-localization");

describe("detectLocale", () => {
  it("returns 'es' for Spanish device locale", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "es-ES" },
    ]);
    expect(detectLocale()).toBe("es");
  });

  it("falls back to 'en' for unsupported locale", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([
      { languageTag: "fr-FR" },
    ]);
    expect(detectLocale()).toBe("en");
  });

  it("returns 'en' when no locale available", () => {
    (Localization.getLocales as jest.Mock).mockReturnValue([]);
    expect(detectLocale()).toBe("en");
  });
});
```

### Test Coverage Targets

- `src/i18n/` — 100% (new module, no legacy)
- Feature screens — 80% minimum (existing coverage threshold)
- Shared UI components — 100% (small, focused components)

---

## 8. Migration Strategy

### Migration Order

The order is driven by dependency and risk:

| Phase | Files | Rationale |
|-------|-------|-----------|
| 1 | `src/i18n/` (new) | Foundation. No existing code touched. |
| 2 | `lingui.config.ts`, `metro.config.js`, `babel.config.js`, `package.json` | Toolchain. Validates build works. |
| 3 | `app/_layout.tsx` | Provider integration. Minimal string changes. |
| 4 | `src/shared/schemas/auth.ts` | Schema factory. Small, isolated. |
| 5 | `src/shared/ui/*.tsx` (5 files) | Shared components. Used everywhere. |
| 6 | `app/(tabs)/_layout.tsx` | Tab labels. Visible, low risk. |
| 7 | `src/features/auth/screens/*.tsx` | First feature. Mix of Spanish/English — good validation. |
| 8 | `src/features/exercises/screens/*.tsx` | Pure English. Straightforward. |
| 9 | `src/features/history/screens/*.tsx` | Pure English. Straightforward. |
| 10 | `src/features/records/screens/*.tsx` | Pure English. Straightforward. |
| 11 | `src/features/workout/screens/*.tsx` | Most complex (635 lines). Last. |

### Handling Mixed Spanish/English

During migration, the app will have mixed languages. Strategy:

1. **Phase 3 (Provider)**: All existing strings remain as-is. App looks identical.
2. **Phase 7 (Auth screens)**: The Spanish strings in `LoginScreen.tsx` ("Accede a tu cuenta") and English strings everywhere else will both be extracted to the English catalog. The Spanish catalog gets proper translations.
3. **No intermediate broken state**: At every phase, the app renders. Strings that aren't wrapped yet display as-is (they're just React text nodes). Strings wrapped in `<Trans>` or `t()` show the English catalog.

### Rollback Plan

Each phase is a separate commit. If issues arise:

1. **Metro transformer conflicts**: Revert `metro.config.js` and `package.json`. The Lingui transformer can be removed cleanly since it only processes files with macros.
2. **Babel plugin conflicts**: Revert `babel.config.js`. The macro plugin is additive.
3. **Provider breaks rendering**: Revert `app/_layout.tsx`. i18n code in `src/i18n/` is inert without the provider.
4. **Full rollback**: `git revert` all i18n commits. No persistent side effects.

### Incremental Validation

After each phase:

```bash
npx tsc --noEmit        # type check
npx jest                 # all tests pass
npm start                # metro bundler starts
npm run android          # build succeeds
```

---

## 9. Performance Considerations

### Bundle Size Impact

| Component | Size Impact | Notes |
|-----------|-------------|-------|
| `@lingui/core` | ~3 KB gzipped | Runtime i18n engine |
| `@lingui/react` | ~2 KB gzipped | Provider + Trans component |
| Common catalog (en) | ~1 KB | ~25 strings |
| Common catalog (es) | ~1.2 KB | ~25 strings |
| Per-feature catalog | ~0.5-2 KB each | Lazy loaded, not in initial bundle |

**Total initial bundle impact**: ~6-7 KB gzipped (common + core + react). Feature catalogs load on demand.

### Catalog Loading Strategy

1. **Synchronous**: `common` namespace loaded at startup. Ensures tab labels and headers render immediately.
2. **Asynchronous**: Feature namespaces loaded via dynamic `import()`. Metro code-splits at the `import()` boundary.
3. **Cached**: Once loaded, catalog stays in memory. No re-fetching on navigation.
4. **Preloaded**: Common next-namespace (workout, exercises) preloaded when tabs mount.

### Memory Usage

- Each catalog is a plain JS object (~0.5-2 KB). Even all catalogs loaded simultaneously would be ~15 KB.
- Lingui's `i18n` instance holds active catalog in memory. Inactive catalogs are garbage-collected if not referenced.
- No impact on React Native bridge or native modules.

### Re-render Behavior

When `i18n.activate(locale)` is called:
1. `I18nProvider` triggers a re-render of the entire subtree.
2. All `<Trans>` components re-render with new messages.
3. All `useLingui()` consumers re-render.
4. This is expected behavior for locale switching. It's infrequent (user-initiated) so not a performance concern.

### Optimization: Avoid Unnecessary Re-renders

For components that don't use translated strings but are children of `I18nProvider`:

- `GradientBackground` — pure styling, no text. Re-render is lightweight.
- `QueryClientProvider` — memoized. Not affected.
- Zustand stores — subscription-based, not affected by React context.

No special optimization needed.

---

## 10. Dependencies

### New Dependencies

```json
{
  "@lingui/core": "^6.0.0",
  "@lingui/react": "^6.0.0",
  "@lingui/macro": "^6.0.0",
  "@lingui/cli": "^6.0.0",
  "@lingui/metro-transformer": "^6.0.0",
  "expo-localization": "~16.0.0"
}
```

**Note**: `expo-localization` is already compatible with Expo SDK 54. Verify it's installed:

```bash
npx expo install expo-localization
```

### Dev Dependencies

```json
{
  "@lingui/cli": "^6.0.0"
}
```

### Package.json Scripts

Add to `scripts`:

```json
{
  "i18n:extract": "lingui extract",
  "i18n:compile": "lingui compile",
  "i18n:types": "lingui extract --typescript"
}
```

---

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| NativeWind + Lingui metro transformer conflict | High | Test dev server in Phase 1 before any code changes. If conflict, use Lingui's Babel-only mode (skip metro transformer, compile catalogs at build time). |
| `useLingui` in tab layout causes full re-render on locale switch | Low | Expected behavior. Only triggered on explicit locale change. |
| Zod schema factory pattern breaks existing `useForm` usage | Medium | Validate that `zodResolver(getLoginSchema())` works the same as `zodResolver(loginSchema)`. Update both auth screens atomically. |
| Dynamic imports fail in test environment | Low | Mock `loadCatalog` in test utils. Use static English catalog for tests. |
| String extraction misses template literals in callbacks | Medium | Post-extraction audit. Add ESLint rule `@lingui/no-raw-string` to prevent regressions. |

---

## 12. Open Questions

1. **Should we add a language picker UI now or defer?** The spec supports runtime switching via `setLocale()`, but no UI is planned. Recommendation: defer to a future change. The foundation supports it.

2. **Should `auth.ts` schemas use the factory pattern or key-based translation?** The factory pattern is cleaner but requires changing all `zodResolver()` calls. The key-based approach is simpler but adds indirection. Recommendation: **factory pattern** — it's the standard Lingui approach for Zod.

3. **Should we add `expo-localization` to `app.json` plugins?** Expo SDK 54 auto-detects it. No manual plugin config needed.

---

*Design created 2026-07-05 for the multilingual-i18n change.*
*Follows SDD design phase requirements.*
