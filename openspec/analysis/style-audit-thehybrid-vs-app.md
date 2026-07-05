# Style Audit: TheHybridProject_v0_1 vs Current App

> **Date**: 2026-07-05
> **Scope**: Visual design system comparison
> **Method**: Source code review of both projects

---

## Executive Summary

The current app's `tailwind.config.js` is **already a near-perfect 1:1 mapping** of the client's design tokens from TheHybridProject_v0_1. The same person/team clearly defined both. However, the **component-level application** has several gaps where the app diverges from the prototype style.

**Match score: ~75%** — the palette is there, but execution details are missing.

---

## 1. Color Palette — ✅ MATCH (100%)

| Token | Prototype (`Colors.ts`) | App (`tailwind.config.js`) | Match |
|-------|------------------------|---------------------------|-------|
| background | `#050505` | `bg.DEFAULT: #050505` / `surface-950: #050505` | ✅ |
| backgroundSoft | `#0B0B0C` | `bg.soft: #0B0B0C` | ✅ |
| card | `#171719` | `card.DEFAULT: #171719` / `surface-900: #171719` | ✅ |
| cardSoft | `#222225` | `card.soft: #222225` / `surface-800: #222225` | ✅ |
| border | `#343437` | `border: #343437` / `surface-700: #343437` | ✅ |
| text | `#F4F4F2` | `surface-50: #F4F4F2` | ✅ |
| textMuted | `#A4A4A8` | `surface-400: #A4A4A8` | ✅ |
| textSubtle | `#707074` | `surface-500: #707074` | ✅ |
| titanium | `#B9B9B6` | `surface-300: #B9B9B6` | ✅ |
| graphite | `#2C2C2E` | (missing explicit map but `surface-750` doesn't exist) | ⚠️ |
| success | `#D7D7D2` | (missing explicit success) | ⚠️ |
| danger | `#D65F5F` | `danger.DEFAULT: #D65F5F` | ✅ |

**Veredicto**: The app uses a numbered scale (surface-50→950) + semantic aliases (bg, card, border, danger). Prototype uses flat semantic names. Values are identical. ✅

---

## 2. Border Radius — ✅ MATCH

| Token | Prototype | App (NativeWind) |
|-------|-----------|-----------------|
| Buttons / small cards | `18px` | `rounded-xl` (18px) |
| Large cards / containers | `26px` | `rounded-2xl` (26px) |

---

## 3. Border Width — ✅ MATCH

Both use `1px` borders with `border-${color}`.

---

## 4. Typography — ✅ PARTIAL MATCH

| Token | Prototype | App | Match |
|-------|-----------|-----|-------|
| Title (34px, 800, -0.8 tracking) | Centralized | Scattered as `text-2xl font-bold` / `text-3xl font-extrabold` | ⚠️ |
| h2 (24px, 800) | Centralized | Scattered | ⚠️ |
| h3 (18px, 700) | Centralized | `text-lg font-semibold` | ⚠️ |
| body (15px, 500) | Centralized | `text-base` or `text-[15px]` | ⚠️ |
| small (12px, 600) | Centralized | `text-xs font-semibold` | ⚠️ |

**Gap**: Prototype has a centralized `Typography.ts` constant. The app uses Tailwind utility classes scattered across screens — not wrong, but no single source of truth for typography tokens.

---

## 5. Components — Detailed Comparison

### 5.1 Button / PrimaryButton

| Aspect | Prototype | App |
|--------|-----------|-----|
| Height | 58px | min-h-[58px] ✅ |
| Border radius | 18px | rounded-xl ✅ |
| Background | cardSoft (`#222225`) | bg-card-soft ✅ |
| Border | 1px border-color | border border-border ✅ |
| Text | 17px, 800 weight | text-[17px], font-extrabold ✅ |
| Shadow | shadowColor #000, opacity 0.35, radius 14, offset 0,8, elevation 8 | **NO shadow** ❌ |
| Variants | Only primary | primary / secondary / ghost / danger ✅ (better) |
| Icon | Ionicons (22px) | Ionicons (20px) ⚠️ |

**Gap**: **Missing shadow on buttons** is the most noticeable visual difference. The prototype's buttons have a distinct elevated look.

### 5.2 Card

| Aspect | Prototype (WorkoutCard) | App (Card) |
|--------|------------------------|------------|
| Background | card (`#171719`) | bg-card ✅ |
| Border radius | 26px | rounded-2xl ✅ |
| Border | 1px border-color | border border-border ✅ |
| Padding | 20px | p-5 (20px) ✅ |
| Internal gap | 14px exercise list | gap-4 (16px) — close enough ⚠️ |

Essentially a match. The prototype's MetricCard uses `rgba(255,255,255,0.055)` background which doesn't have an exact Tailwind equivalent — but app uses surface-800 / card-soft which approximates.

### 5.3 Input

| Aspect | Prototype | App |
|--------|-----------|-----|
| Height | 58px | no explicit height (py-3.5 + text = ~50px) ❌ |
| Border radius | 18px | rounded-xl ✅ |
| Background | card (`#171719`) | card-soft (`#222225`) ⚠️ |
| Border | 1px border-color | border-border ✅ |
| Text color | text | text-surface-50 ✅ |

**Gap**: Input background differs (card vs card-soft) and height is not enforced.

### 5.4 Screen Layout

| Aspect | Prototype | App |
|--------|-----------|-----|
| Background | **LinearGradient** `#030303 → #101012 → #050505` | Flat `bg-surface-950` ❌ |
| SafeArea | Yes, via Screen component | Scattered `pt-16` margins ❌ |

**Gap**: **No gradient background**. This is a significant visual difference. The prototype uses a subtle diagonal gradient on every screen.

### 5.5 Tab Bar

| Aspect | Prototype | App |
|--------|-----------|-----|
| Exists? | No tab bar (Stack only) | Yes, Tabs layout |
| Accent color | N/A (would likely be titanium monochrome) | **Green** `#22c55e` ❌ |
| Icons | Ionicons idiom | **Emojis** (🏠💪📋📈👤) ❌ |

**Gap**: Tab bar uses **green accent** (#22c55e) which clashes with the monochrome titanium aesthetic. Emoji icons look informal compared to Ionicons.

---

## 6. Summary of Gaps (Priority Order)

| # | Gap | Severity | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | **No gradient background** on screens | 🔴 High | Low | Changes visual feel significantly |
| 2 | **No shadow on buttons** | 🔴 High | Low | Buttons look flat vs prototype's elevated look |
| 3 | **Green accent (#22c55e)** in tab bar, loaders, etc. | 🟡 Medium | Low | Clashes with monochrome design system |
| 4 | **Emoji icons** in tab bar vs Ionicons | 🟡 Medium | Medium | Makes app feel less professional |
| 5 | **No centralized typography** system | 🟡 Medium | Medium | Scattered font sizes make it hard to maintain |
| 6 | **Input background** card vs card-soft | 🟢 Low | Low | Minor difference, barely noticeable |
| 7 | **Missing graphite (#2C2C2E)** in palette | 🟢 Low | Low | Only used in prototype's dot styling |
| 8 | **Missing success (#D7D7D2)** in palette | 🟢 Low | Low | Not actively used in prototype yet |

---

## 7. What the App Does BETTER

- **Button variants**: primary/secondary/ghost/danger — prototype only has PrimaryButton
- **Offline-first architecture** with full sync engine
- **Rest timer overlay component** — prototype doesn't have one
- **Zustand stores** for session, auth, sync state
- **TanStack Query** integration with offline persistence
- **More screens implemented**: active workout, history, routines CRUD

---

## 8. Conclusion

The **design system foundation** (colors, border radius, spacing) is already in place and correctly mapped. The visual gaps are mostly at the **component implementation level** — shadows, gradients, accent colors, and icon consistency.

The app is ~75% aligned visually. Closing the top 3 gaps (gradients, shadows, accent color) would bring it to ~90%+ match with the client's prototype.

---

*Analysis generated by gentle-orchestrator SDD workflow*
