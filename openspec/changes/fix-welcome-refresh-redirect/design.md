# Design: Fix Welcome Screen Redirect After Web Refresh

## Technical Approach

Single-file change to `app/index.tsx`. The welcome screen subscribes to `useAuthStore` and becomes auth-aware: it renders a logo-only splash while `loading`, redirects `authenticated` users into the app via `router.replace`, and shows the existing welcome UI when `unauthenticated`. The target resolver reuses the exact rule already in `app/(tabs)/_layout.tsx` — no new shared module. A new Jest + RTL test (`app/__tests__/index.test.tsx`) drives all three `state` branches and asserts redirect targets.

## Architecture Decisions

| Decision | Option | Tradeoff | Decision |
|----------|--------|----------|----------|
| Redirect trigger | `useEffect` keyed on `[state, role, isTeamCoach, router]` with `cancelled` cleanup | Synchronous `replace` fires once; `cancelled` guard satisfies spec S6 and is lint-clean only if referenced | Chosen — guard reads `if (!cancelled) router.replace(target)` |
| Target resolver location | Inline const in component | Avoids a one-use shared module; keeps rule colocated with render branch | Chosen |
| `loading`/`authenticated` UI | Same logo-only splash (omit Button blocks) | No flash of login UI; component unmounts on redirect | Chosen |
| Replace timing | Synchronous in effect (no `setTimeout(0)`) | Tabs layout uses `setTimeout(0)` to wait for Root Layout mount; on `/` the Root Layout is already mounted by `AuthGate`, so sync is safe | Chosen, mirroring spec |

## Data Flow

```
app/index.tsx (WelcomeScreen)
   │  useAuthStore()  ── state, role, isTeamCoach
   │  useRouter()     ── replace()
   ▼
useEffect [state, role, isTeamCoach, router]
   ├─ loading / unauthenticated  → render UI (no replace)
   └─ authenticated
         target = (role==="coach" || isTeamCoach) ? "/(coach)" : "/(tabs)/home"
         router.replace(target)  → component unmounts → cleanup sets cancelled=true
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/index.tsx` | Modify | Add `useAuthStore` subscription; `loading`→logo splash, `authenticated`→`useEffect` redirect, `unauthenticated`→existing UI |
| `app/__tests__/index.test.tsx` | Create | Unit test for all three branches + redirect targets |

## Interfaces / Contracts

```tsx
// app/index.tsx
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/auth-store";

export default function WelcomeScreen() {
  const router = useRouter();
  const { state, role, isTeamCoach } = useAuthStore();

  useEffect(() => {
    if (state !== "authenticated") return;
    let cancelled = false;
    const target = role === "coach" || isTeamCoach ? "/(coach)" : "/(tabs)/home";
    if (!cancelled) router.replace(target);
    return () => {
      cancelled = true;
    };
  }, [state, role, isTeamCoach, router]);

  // loading OR authenticated → logo-only splash (no buttons)
  if (state !== "unauthenticated") {
    return ( /* GradientBackground + SafeAreaView + logo/title/footer splash */ );
  }
  // unauthenticated → existing full welcome UI with Inicia sesión / Regístrate
  return ( /* existing welcome markup */ );
}
```

Redirect-target resolver is an inline `const target`; no new module. Splash reuses existing `GradientBackground`, `SafeAreaView`, `Ionicons name="infinite-outline"`, title "THE HYBRID PROJECT", footer "Train to greatness".

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Athlete authenticated → `replace("/(tabs)/home")` | `useAuthStore.setState({ state:"authenticated", role:"athlete", isTeamCoach:false })`; assert `mockReplace` called once with target |
| Unit | Coach authenticated → `replace("/(coach)")` | `setState({ state:"authenticated", role:"coach" })` |
| Unit | Team-coach athlete → `replace("/(coach)")` | `setState({ state:"authenticated", role:"athlete", isTeamCoach:true })` |
| Unit | Unauthenticated → no redirect, buttons present | `setState({ state:"unauthenticated" })`; `mockReplace` not called; `getByText("Inicia sesión")` truthy |
| Unit | Loading → splash only, no redirect | `setState({ state:"loading" })`; `mockReplace` not called; no button text |

**Test setup (mirrors `app/(auth)/__tests__/signup-info.test.tsx`):**
- `jest.mock("expo-router", () => ({ useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn() }), useSegments: () => [], useLocalSearchParams: () => ({}), Stack: { Screen: () => null } }))` — local mock overrides `jest.setup.ts` global so `mockReplace` is assertable.
- `useAuthStore.setState({...})` drives each branch in `beforeEach`; `jest.clearAllMocks()`.
- `render(<WelcomeScreen />)` from `@testing-library/react-native`.
- `Button`, `GradientBackground`, `Ionicons` already mocked in `jest.setup.ts` → no extra mocks needed.
- `@/` alias works via `tsconfig.json` `paths` + ts-jest (confirmed). Coverage ≥80% for `app/index.tsx`.

## Threat Matrix

N/A — no routing-rule *changes* to the router itself, no shell/subprocess, no VCS/PR automation, no executable-file classification, no process integration. The change consumes `useRouter().replace` (existing, already tested elsewhere).

## Migration / Rollout

No migration required. Atomic single-file revert via `git checkout -- app/index.tsx`. No schema/store/client changes.

## Open Questions

- None. Auth/session restoration verified correct in scope; follow existing `(tabs)/_layout.tsx` guard rule verbatim.
