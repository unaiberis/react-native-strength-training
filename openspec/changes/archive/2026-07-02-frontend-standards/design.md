# Design: Frontend Standards

## Technical Approach

Non-functional hardening across six orthogonal axes: linting config, format gating, accessibility, error resilience, rendering performance, and test coverage. Each axis is a self-contained delta touching no business logic — implementation is additive, behavioral changes are zero by spec.

## File Changes

| File                                                             | Action | Deliverable                                 |
| ---------------------------------------------------------------- | ------ | ------------------------------------------- |
| `eslint.config.mjs`                                              | Create | A — ESLint Flat Config                      |
| `.prettierrc`                                                    | Create | B — Prettier config                         |
| `package.json`                                                   | Modify | B — lint-staged config + scripts            |
| `.husky/pre-commit`                                              | Create | B — pre-commit hook                         |
| `src/shared/ui/Button.tsx`                                       | Modify | C — a11y props                              |
| `src/shared/ui/Input.tsx`                                        | Modify | C — a11y props                              |
| `src/shared/ui/Card.tsx`                                         | Modify | C — a11y props + onPress                    |
| `src/shared/ui/RestTimer.tsx`                                    | Modify | C — a11y label                              |
| `app/(tabs)/train.tsx`                                           | Modify | C — a11y on TouchableOpacity                |
| `app/(tabs)/index.tsx`                                           | Modify | C — a11y on TouchableOpacity                |
| `app/(tabs)/programs.tsx`                                        | Modify | C — a11y on TouchableOpacity                |
| `src/shared/ui/ErrorBoundary.tsx`                                | Create | D — ScreenErrorBoundary                     |
| `app/_layout.tsx`                                                | Modify | D — wrap (auth) and (tabs)                  |
| `src/shared/ui/Card.tsx`                                         | Modify | E — React.memo                              |
| `src/shared/ui/Button.tsx`                                       | Modify | E — React.memo                              |
| `src/shared/ui/RestTimer.tsx`                                    | Modify | E — React.memo                              |
| `src/features/exercises/screens/ExerciseListScreen.tsx`          | Modify | E — React.memo ExerciseItem + getItemLayout |
| `src/features/history/screens/HistoryListScreen.tsx`             | Modify | E — React.memo SessionRow + getItemLayout   |
| `src/features/routines/screens/RoutineListScreen.tsx`            | Modify | E — React.memo RoutineItem + getItemLayout  |
| `src/shared/ui/__tests__/Button.test.tsx`                        | Create | F — tests                                   |
| `src/shared/ui/__tests__/Input.test.tsx`                         | Create | F — tests                                   |
| `src/shared/ui/__tests__/Card.test.tsx`                          | Create | F — tests                                   |
| `src/shared/ui/__tests__/ErrorBoundary.test.tsx`                 | Create | F — tests                                   |
| `src/features/workout/hooks/__tests__/useWorkoutSession.test.ts` | Create | F — tests                                   |

---

## A. ESLint Flat Config

### Design

Single `eslint.config.mjs` at project root. Flat config (ESLint 9+ native format). Uses:

- **`@eslint/js`** — `recommended` config for all JS/TS/TSX files
- **`typescript-eslint`** — `strictTypeChecked` config for `.ts`/`.tsx`; requires `tsconfig.json` via `languageOptions.parserOptions.project`
- **`eslint-plugin-react-native-a11y`** — `recommended` config for `.tsx` files only
- **`no-restricted-imports`** custom rule: forbids `src/features/X` from importing `src/features/Y` (sibling features) — only `shared/`, `lib/`, `stores/`, `types/` allowed

### Exact file: `eslint.config.mjs`

```js
// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import rnA11y from 'eslint-plugin-react-native-a11y';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'node_modules/',
      'dist/',
      '.expo/',
      'pb_data/',
      '*.js',
      'scripts/',
    ],
  },

  // 1. Base: @eslint/js recommended — all files
  js.configs.recommended,

  // 2. TypeScript strict-type-checked — .ts/.tsx only
  ...tseslint.configs.strictTypeChecked.map((cfg) => ({
    ...cfg,
    files: ['**/*.ts', '**/*.tsx'],
  })),

  // 3. Override for tsconfig project path
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { project: ['./tsconfig.json'] },
    },
  },

  // 4. React Native A11y — .tsx only
  {
    files: ['**/*.tsx'],
    ...rnA11y.configs.recommended,
  },

  // 5. Custom rules
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['src/features/*/*'],
              message:
                'Features must not import from sibling features. Import from shared/, lib/, stores/, or types/ instead.',
            },
          ],
        },
      ],
    },
  }
);
```

### Packages to install

```bash
npm install --save-dev \
  eslint@^9 \
  @eslint/js@^9 \
  typescript-eslint@^8 \
  eslint-plugin-react-native-a11y@^4
```

Update `package.json` scripts: change `"lint": "eslint ."` (replacing `"expo lint"`).

---

## B. Prettier + lint-staged + husky

### .prettierrc

```json
{
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

### package.json additions

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,json,css,md}": ["prettier --write", "eslint --fix"]
  }
}
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
npx lint-staged
```

### Setup commands

```bash
npm install --save-dev prettier@^3 lint-staged@^15 husky@^9
npx husky init
```

---

## C. Shared UI Accessibility

### C1. Button.tsx

Add three props to the `TouchableOpacity`:

```tsx
<TouchableOpacity
  disabled={isDisabled}
  accessibilityRole="button"
  accessibilityState={{ disabled: isDisabled }}
  accessibilityLabel={title}
  // ... existing className, style, ...props
>
```

No structural changes — props are additive.

### C2. Input.tsx

Add `accessibilityLabel` on the `TextInput` for the wrapping label:

```tsx
<TextInput
  ref={ref}
  accessibilityLabel={label ?? props.placeholder ?? "Input"}
  accessibilityRole="none"
  placeholderTextColor="#71717a"
  // ... existing classNames, events, ...props
>
```

### C3. Card.tsx

Two changes:

1. Accept optional `onPress` in `CardProps`
2. Conditionally make the root `View` accessible when `onPress` is present
3. Wrap with `TouchableOpacity` when `onPress` is provided, else plain `View`

```tsx
interface CardProps {
  children: ReactNode;
  title?: string;
  onPress?: () => void;
  className?: string;
  style?: ViewStyle;
}

export function Card({
  children,
  title,
  onPress,
  className,
  style,
}: CardProps) {
  const content = (
    <>
      {title && <Text className="...">{title}</Text>}
      {children}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={title ?? 'Card'}
        className={`bg-surface-900 rounded-2xl p-4 border border-surface-800 ${className ?? ''}`}
        style={style}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View
      className={`bg-surface-900 rounded-2xl p-4 border border-surface-800 ${className ?? ''}`}
      style={style}
    >
      {content}
    </View>
  );
}
```

### C4. RestTimer.tsx

The `RestTimer` overlay already uses `TouchableOpacity` for "Skip Rest". The a11y changes:

1. Make the timer display area `accessible` with `accessibilityLabel` that describes remaining time
2. Add `accessibilityRole`/`accessibilityLabel` to the skip button

```tsx
<View accessible accessibilityLabel={`Rest timer: ${formatRestTime(remainingSeconds)} remaining`}>
  {/* Timer display */}
  <Text className="text-surface-50 text-5xl font-bold font-mono tracking-widest mb-2">
    {formatRestTime(remainingSeconds)}
  </Text>
</View>

<TouchableOpacity
  onPress={stopRest}
  accessibilityRole="button"
  accessibilityLabel="Skip rest timer"
  // ... existing className
>
```

### C5. TouchableOpacity in app/

| File                      | Line(s)     | Change                                                             |
| ------------------------- | ----------- | ------------------------------------------------------------------ |
| `app/(tabs)/index.tsx`    | 23, 36, 52  | Add `accessibilityRole="button"` + `accessibilityLabel` per button |
| `app/(tabs)/train.tsx`    | 62, 75, 109 | Add `accessibilityRole="button"` + `accessibilityLabel` per button |
| `app/(tabs)/programs.tsx` | 38          | Add `accessibilityRole="button"` + `accessibilityLabel`            |

Accessibility labels derived from the Text children — e.g., for "Exercises" button: `accessibilityLabel="Exercises, Browse library"`.

---

## D. ErrorBoundary

### D1. ScreenErrorBoundary — Class component

Error boundaries require class component lifecycle (`componentDidCatch`, `getDerivedStateFromError`). File: `src/shared/ui/ErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
  screenName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ScreenErrorBoundary] ${this.props.screenName ?? 'Screen'} crashed:`,
      error,
      info.componentStack
    );
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View className="flex-1 bg-surface-950 items-center justify-center px-8">
          <Text className="text-red-400 text-lg font-semibold mb-2">
            Something went wrong
          </Text>
          <Text className="text-surface-400 text-sm text-center mb-6">
            {this.props.screenName
              ? `"${this.props.screenName}" encountered an error.`
              : 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            onPress={this.handleRetry}
            className="bg-brand-500 rounded-xl py-3 px-8"
            accessibilityRole="button"
            accessibilityLabel="Retry"
          >
            <Text className="text-surface-950 font-semibold text-base">
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
```

### D2. Integration in app/_layout.tsx

Wrap the routing groups inside `AuthGate`:

```tsx
import { ScreenErrorBoundary } from '../src/shared/ui/ErrorBoundary';

// Inside RootLayout:
<ScreenErrorBoundary screenName="Root">
  <AuthGate>{/* existing StatusBar + Stack */}</AuthGate>
</ScreenErrorBoundary>;
```

For per-screen granularity within the Stack, wrap each `Stack.Screen` children or the group layouts. Minimal viable: one boundary wrapping the entire Stack inside AuthGate.

---

## E. Performance

### E1. getItemLayout

| Screen                   | FlatList line | itemHeight |
| ------------------------ | ------------- | ---------- |
| `ExerciseListScreen.tsx` | 168           | 100        |
| `HistoryListScreen.tsx`  | 270           | 120        |
| `RoutineListScreen.tsx`  | 170           | 100        |

Add to each FlatList:

```tsx
getItemLayout={(_, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
})}
```

Define constant at top of each file (e.g., `const ITEM_HEIGHT = 100`).

### E2. React.memo

| Component      | File                              | Reason                               |
| -------------- | --------------------------------- | ------------------------------------ |
| `Button`       | `src/shared/ui/Button.tsx`        | Rendered in lists, form toolbars     |
| `Card`         | `src/shared/ui/Card.tsx`          | Rendered in dashboard-style screens  |
| `RestTimer`    | `src/shared/ui/RestTimer.tsx`     | Re-renders every second via interval |
| `ExerciseItem` | `ExerciseListScreen.tsx` (inline) | FlatList row                         |
| `SessionRow`   | `HistoryListScreen.tsx` (inline)  | FlatList row                         |
| `RoutineItem`  | `RoutineListScreen.tsx` (inline)  | FlatList row                         |

Pattern for inline components (e.g., `ExerciseItem`): extract to top-level `const ExerciseItem = React.memo(function ExerciseItem(...) { ... })`.

For `Button` and `Card`: wrap export with `React.memo`.

### E3. useCallback

All render-item callbacks and press handlers in `ExerciseListScreen`, `HistoryListScreen`, `RoutineListScreen` are already wrapped in `useCallback`. Verify no direct inline arrow functions remain in `renderItem` or `onPress` props passed to memoized children.

Additionally: handlers passed to memoized `Button`/`Card` instances across the app should use `useCallback` — mostly already done in screen components.

---

## F. Tests

### F1. Test file structure

```
src/shared/ui/__tests__/
├── Button.test.tsx
├── Input.test.tsx
├── Card.test.tsx
└── ErrorBoundary.test.tsx

src/features/workout/hooks/__tests__/
└── useWorkoutSession.test.ts
```

### F2. Test design

**Button.test.tsx**: `render(<Button title="Submit" />)` → verify `getByRole("button")` exists, text "Submit" visible, no loading indicator. With `loading={true}`: verify `accessibilityState.disabled`. With `disabled={true}`: verify disabled state.

**Input.test.tsx**: `render(<Input label="Email" />)` → verify `accessibilityLabel` equals "Email". With `error="Required"`: verify error text visible.

**Card.test.tsx**: `<Card title="Stats"><Text>Content</Text></Card>` → verify content renders. With `onPress` added: verify `accessibilityRole="button"`. Without `onPress`: verify no accessibilityRole.

**ErrorBoundary.test.tsx**: Render `ScreenErrorBoundary` wrapping a component that throws → verify fallback message visible. Tap "Retry" → verify children re-render (boundary resets). Use a `ThrowBaby` pattern: `const ThrowBaby = () => { throw new Error("crash"); }`.

**useWorkoutSession.test.ts**: Mock PocketBase client. Test `useCreateSession` mutation calls `SessionsService.createSession` with correct args when online. Test `useLogSet` calls `SessionsService.logSet`. Test `useCompleteSession` / `useCancelSession`. For offline branch: mock dynamic import of `createOfflineSessions`.

### F3. Mock requirements for useWorkoutSession test

- Mock `@/lib/pocketbase/services/sessions` — all four functions (`createSession`, `logSet`, `completeSession`, `cancelSession`)
- Mock `@/stores/auth-store` — provide mock user.id, isOnline=true/false
- Mock `@/stores/session-store` — provide activeSessionId, addLoggedSet, clearSession
- For offline tests: mock dynamic import of `../../../lib/db/database`, `../../../lib/db/change-queue`, `../../../lib/db/services/offline-sessions` via `jest.mock` at module level

---

## Architecture Decisions

| Decision               | Options                                        | Choice                    | Rationale                                                                                     |
| ---------------------- | ---------------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| ESLint format          | Legacy `.eslintrc` vs flat `eslint.config.mjs` | Flat config               | ESLint 9+ deprecates legacy; flat config is future-proof, composable                          |
| ErrorBoundary pattern  | HOC vs class component                         | Class component           | React requires `componentDidCatch` — class only; no alternative                               |
| React.memo scope       | All components vs FlatList rows only           | Memo all 6 specified      | RestTimer re-renders every 1s; Card/Button reused widely; rows are FlatList perf              |
| getItemLayout strategy | Fixed height vs dynamic                        | Fixed heights (100/120px) | All rows have uniform height per list; dynamic would require `onLayout` overhead              |
| Test mock approach     | Full integration vs unit with mocked deps      | Unit with mocked deps     | Current jest setup is `node` env without RN rendering; `renderHook` works but no native views |

---

## PR Boundary Plan

### PR 1 (Config — ~150 lines)

- `eslint.config.mjs` + `.prettierrc` + `.husky/pre-commit` + `package.json` (lint-staged)
- Install commands documented in PR body
- `npx eslint .` must pass — if existing code has strict-type-checked violations, fix them in this PR
- Risk: strict-type-checked may flag ~20-40 type issues — estimate before committing

### PR 2 (Code — ~200 lines)

- All a11y additions (Button, Input, Card, RestTimer, app/ screens)
- `ScreenErrorBoundary` + `_layout.tsx` integration
- Performance: React.memo + getItemLayout + useCallback verification
- No behavioral changes — additive only

### PR 3 (Tests — ~350 lines)

- All 5 test files (Button, Input, Card, ErrorBoundary, useWorkoutSession)
- Depends on PR 2 being merged (components must exist with a11y props)
- Coverage threshold: 80% per new/modified file

---

## Data Flow / Dependencies

```
PR 1 (Config) ── no deps
PR 2 (Code)   ── no deps on PR 1
PR 3 (Tests)  ── depends on PR 2 components
```

PR 1 and PR 2 are independent and could be parallelized. PR 3 is sequential after PR 2.

---

## Risks & Mitigations

| Risk                                                                | Likelihood         | Impact | Mitigation                                                                                                                                                  |
| ------------------------------------------------------------------- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint `strictTypeChecked` flags ~40 existing type issues           | High               | Medium | Run `npx eslint .` first, assess count; add inline `// eslint-disable-next-line` with JIRA ticket ref if too many                                           |
| ErrorBoundary renders loading state for render crashes only         | Always (by design) | Low    | Document that event handler errors (e.g., `onPress` with syntax error) are NOT caught — use `try/catch` in handlers                                         |
| React.memo stale closure on `handlePress` in list items             | Low                | Medium | Verify with `why-did-you-render` or manual code review; `useCallback` wrappers in parents prevent this                                                      |
| RestTimer a11y label goes stale if `formatRestTime` output is empty | Low                | Low    | Guard: only set `accessibilityLabel` when `isRunning` is true                                                                                               |
| `no-restricted-imports` pattern misses barrel imports               | Medium             | Low    | Pattern `src/features/*/*` catches direct file imports; barrel re-exports from `src/features/*/index` could bypass — add `src/features/*` pattern if needed |

---

## Open Questions

- [ ] Should ESLint `strictTypeChecked` be `strict` instead of `strictTypeChecked` to reduce initial noise? Spec says `strict-type-checked` — confirm willingness to fix 20-40 existing type issues.
- [ ] Should we add `eslint-plugin-react-native` for linting RN-specific patterns (styleSheet usage, etc.)? Not in spec, but common.
- [ ] Is the RestTimer `accessibilityLabel` sufficient as a static label, or should it be dynamic and updated via `setAccessibilityLabel` every second? Static is enough for screen readers on initial render — they re-read on focus.

---

## Testing Strategy

| Layer | What                         | Approach                                                                             |
| ----- | ---------------------------- | ------------------------------------------------------------------------------------ |
| Unit  | Button a11y + loading states | `getByRole("button")`, `getByText`, `.props.accessibilityState`                      |
| Unit  | Input a11y                   | Verify `accessibilityLabel` via `.props` after render                                |
| Unit  | Card interactive toggle      | Render with/without `onPress`, check `accessibilityRole`                             |
| Unit  | ErrorBoundary lifecycle      | Throw inside child, verify fallback, click Retry, verify recovery                    |
| Unit  | useWorkoutSession hooks      | renderHook + useMutation, verify service calls inline args, online/offline branching |

`npx jest --coverage` threshold: 80% per new/modified file.
