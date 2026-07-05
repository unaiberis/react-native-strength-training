# Proposal: Align UI with TheHybridProject Prototype Design System

## Intent

Align the app's visual implementation with the client's TheHybridProject_v0_1 design system. The design tokens (colors, radius, spacing) in `tailwind.config.js` already match the prototype 1:1, but 7 gaps exist at the component/screen level — missing button shadows, flat backgrounds instead of gradients, green accent clashing with monochrome palette, emoji icons in tab bar, incorrect input background color, no centralized typography constants, and two missing color aliases. Closing the top 6 gaps brings the app to ~90%+ visual parity.

## Scope

### In Scope

1. Fix Input background: `bg-card-soft` → `bg-card` (1 file, 1 line)
2. Add prototype button shadow styles (1 file)
3. Replace emoji tab icons with Ionicons (1 file)
4. Replace green `#22c55e` accent with monochrome `textMuted`/`titanium` (12 files)
5. Add gradient background wrapper + apply to all screens (22 files + 1 new + dependency)
6. Create centralized Typography constants file (1 new file, future-proofing)

### Out of Scope

- Missing `graphite` / `success` color aliases in `tailwind.config.js` (postponed — not blocking visual parity)
- RestTimer or other UI component restyling beyond documented gaps
- Any non-visual features, logic changes, or new screens

## Capabilities

> This section is the CONTRACT between proposal and specs phases.

### New Capabilities

None — this change introduces no new feature capabilities.

### Modified Capabilities

None — the existing `design-system` spec (`openspec/specs/design-system/spec.md`) already documents the correct behavior (button shadows, gradient backgrounds, Ionicons, typography tokens, color palette). This is pure implementation alignment — no spec-level requirements change.

## Approach

Tackle in priority order per the exploration findings. Each gap is isolated in its own commit:

1. **Input bg**: Single-line fix in `Input.tsx`
2. **Button shadows**: Add `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius`, `elevation` to `Button.tsx`
3. **Tab layout**: Replace emoji map with Ionicons + switch `tabBarActiveTintColor` from green to `titanium`
4. **Green accent sweep**: Global search/replace `#22c55e` → `#B9B9B6` (titanium) across 12 screen files
5. **Gradient background**: Install `expo-linear-gradient`, create `GradientBackground` wrapper, wrap all 22 screen root views
6. **Typography constants**: Create `typography.ts` with all 5 token categories as frozen constants

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/shared/ui/Input.tsx` | Modified | Input bg: `card-soft` → `card` |
| `src/shared/ui/Button.tsx` | Modified | Add shadow styles |
| `app/(tabs)/_layout.tsx` | Modified | Emojis → Ionicons + green → titanium |
| 12 screen files (app/ + src/features/) | Modified | `#22c55e` → `titanium` (#B9B9B6) |
| 22 screen/layout files | Modified | Flat `bg-surface-950` → `GradientBackground` |
| `src/shared/ui/GradientBackground.tsx` | New | Reusable gradient wrapper component |
| `src/shared/utils/typography.ts` | New | Centralized typography constants |
| `package.json` | Modified | Add `expo-linear-gradient` dependency |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Gradient touches 22 files — oversight risk | Low | Wrapper component isolates logic; each screen diff is small |
| Green → titanium may make spinners invisible on dark bg | Low | Use `textMuted` (#A4A4A8) for spinners, `titanium` for tab accent |
| Shadow on buttons affects layout on older RN versions | Low | `shadow*` props are non-layout — no shift risk |

## Rollback Plan

Each gap is in its own commit. Revert individual commits with `git revert <hash>`. To roll back the entire change: `git revert HEAD~6..HEAD`. No data schema or business logic changes — revert is always safe.

## Dependencies

- `expo-linear-gradient` — requires install for the gradient background wrapper

## Success Criteria

- [ ] Visual comparison screenshots match between prototype and app for Home, Login, and Train screens
- [ ] Zero occurrences of `#22c55e` remaining in source code
- [ ] Zero emoji characters used as tab bar icons
- [ ] `src/shared/utils/typography.ts` exists with all 5 token categories (title, h2, h3, body, small)
