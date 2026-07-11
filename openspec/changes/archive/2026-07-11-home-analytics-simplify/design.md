# Design: Simplify Home & Analytics (home-analytics-simplify)

## Technical Approach

Two independent, low-risk UI/route changes (no schema or persisted-data impact):
- **A** — Drop the "Best e1RM" `StatCard` from the Home surface; e1RM stays in `Analytics → analytics/exercise/[id]` progression detail.
- **B** — Extract the PR presentation out of `ProgressScreen` into a shared `PersonalRecordsSection` component, render it at the bottom of `AnalyticsScreen`, delete the standalone `progress` route/tab.

## Critical Codebase Finding (must read before apply)

The launch brief says *"read `app/(tabs)/index.tsx` (Home, Best e1RM…)"*. In the actual repo, `app/(tabs)/home.tsx` is the **real Home tab** (`<Tabs.Screen name="home">` in `_layout.tsx`, line 91). `app/(tabs)/index.tsx` is the **hidden route** (`<Tabs.Screen name="index" options={{ href: null }}>`, line 146). **Both files render a "Best e1RM" `StatCard`.** Change A must remove the card from **both** `home.tsx` and `index.tsx`. (`index.test.tsx` tests `index.tsx`, not `home.tsx`.)

## Architecture Decisions

| Decision | Options | Tradeoff | Chosen |
|----------|---------|----------|--------|
| Where PRs live | Relocate into Analytics; keep separate tab | Separate tab = redundant nav; Analytics already shows charts | **Merge into Analytics** (spec `Display` relocated) |
| PR component shape | Shared `PersonalRecordsSection` (owns data) vs prop-drilled | Prop-drilling duplicates loading/empty logic in 2 places | **Shared component calls `usePersonalRecords` + `useRouter` itself** (composition, presentational + data) |
| Progress tab | Delete route/tab vs hide (`href:null`) | Hiding leaves dead code + two surfaces | **Delete** `progress.tsx` + `ProgressScreen.tsx` + tab screen |
| `useHomeStats.bestE1RM` | Trim hook output vs leave intact | Trimming changes the hook's public shape; `index.test.tsx` still fixtures `bestE1RM` | **Leave intact** — only remove the two `StatCard` render sites; compute cost is trivial |
| e1RM in Analytics | Touch vs leave exercise detail | Out of scope; coach wants e1RM per-exercise | **Leave untouched** (`ExerciseTimelineScreen`) |

**Rationale for relocation (B):** charts and PRs answer the same "how am I progressing?" question; one tab removes nav redundancy and surfaces PRs beside the data that explains them. **Rationale for shared component:** `PRCard`/`ExercisePRGroup` plus collapse state are self-contained; co-locating data + presentation lets `AnalyticsScreen` stay a thin composition.

## Data Flow

```
AnalyticsScreen
  ├─ useAnalytics(period)  → volume chart + exercise list (unchanged)
  └─ <PersonalRecordsSection />        ← NEW, bottom of scroll
        ├─ usePersonalRecords()        → groupedByExercise, isLoading, totalPRs
        ├─ loading  → ActivityIndicator
        ├─ empty    → "No records yet" + Start Workout CTA (router → /(tabs)/train)
        └─ grouped  → ExercisePRGroup[] (expand/collapse local state)
```

Home (`home.tsx` / `index.tsx`): `useHomeStats()` still returns `bestE1RM` but the value is no longer rendered.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `app/(tabs)/home.tsx` | Modify | Remove `bestE1RM` from `useHomeStats()` destructure (line 23) and delete Row 2 block (lines 109–126, the lone "Best e1RM" `StatCard`). |
| `app/(tabs)/index.tsx` | Modify | Remove `bestE1RM` from destructure (line 28) and delete the 2nd `StatCard` in Row 2 (lines 136–150), leaving "This Week". |
| `app/(tabs)/_layout.tsx` | Modify | Remove `<Tabs.Screen name="progress" …/>` (lines 127–135) and the `progress: "trending-up-outline"` entry in `tabIcons` (line 38). |
| `app/(tabs)/progress.tsx` | Delete | Standalone route no longer referenced. |
| `src/features/records/screens/ProgressScreen.tsx` | Delete | Folded into shared component. |
| `src/features/records/components/PersonalRecordsSection.tsx` | Create | Move `PRCard`, `ExercisePRGroup`, `formatDate` from `ProgressScreen`; own `expandedExercises` state; call `usePersonalRecords()` + `useRouter()`; render header "Personal Records", loading, empty (with Start Workout `Button`), and grouped sections. Reuse `getPRTypeLabel`/`formatPRValue`/`PRDisplayItem` from `usePersonalRecords`. Use `@/` aliases per `AGENTS.md`. |
| `src/features/analytics/screens/AnalyticsScreen.tsx` | Modify | `import { PersonalRecordsSection } from "@/features/records/components/PersonalRecordsSection"`; render `<PersonalRecordsSection />` after the charts block (before bottom spacing, line 219) so it shows regardless of chart `hasData`. |
| `src/features/records/hooks/usePersonalRecords.ts` | Keep | Unchanged; tests retained. |
| `app/(tabs)/__tests__/index.test.tsx` | Modify | Remove obsolete test "renders '—' for bestE1RM when null" (lines 236–251) — that "—" came from the removed card. Add assertion that "Best e1RM" is absent. |

## Interfaces / Contracts

```tsx
// src/features/records/components/PersonalRecordsSection.tsx
export function PersonalRecordsSection(): JSX.Element;
// Internally: usePersonalRecords() + useRouter(); owns expandedExercises state.
// No props — pure composition of existing hook + shared UI.
```

`AnalyticsScreen` integration (one line after charts):
```tsx
<PersonalRecordsSection />
```

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | Home renders without "Best e1RM" | Render `home.tsx` + `index.tsx`; `queryByText("Best e1RM")` is null |
| Unit | `PersonalRecordsSection` groups/empty/loading | Mock `usePersonalRecords`; assert grouped PRs, empty CTA, spinner |
| Unit | No `progress` tab | Render `TabsLayout` (Tabs mocked to capture screens) or assert route file absent + `tabIcons` lacks `progress` |
| Keep | `usePersonalRecords` tests | Unchanged (80% cov preserved) |

Coverage ≥ 80% on every changed/new file (`openspec/config.yaml`).

## Migration / Rollout

None. Pure UI/route removal. Rollback = `git revert`.

## Open Questions / Risks

- **PR scroll overload (Med):** section sits *after* charts and reuses the hook's own loading/empty/collapsed states — already mitigated by design.
- **Existing test breakage (A):** removing the card breaks `index.test.tsx` line 236 "—" assertion → must be deleted/updated in apply (captured above).
- **`home.tsx` has no dedicated test** today; add a render test asserting "Best e1RM" absent (proposal TDD task).
