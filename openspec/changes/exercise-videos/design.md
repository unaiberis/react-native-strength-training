# Design: Embedded Video Player for Exercise Detail

## Technical Approach

Add `react-native-youtube-iframe` + `react-native-webview` (its peer dep) to handle YouTube watch URLs natively, with a universal fallback via WebView for non-YouTube or non-embeddable URLs. A single `VideoPlayer` component encapsulates URL parsing, rendering decision, and error/loading/null states.

## Architecture Decisions

### Decision: Shared vs feature-local component

| Option | Tradeoff |
|--------|----------|
| `src/shared/ui/VideoPlayer.tsx` (chosen) | Reusable by coach library, history, or any future video surface; follows existing pattern in `src/shared/ui/` |
| `src/features/exercises/components/ExerciseVideoPlayer.tsx` | Only usable from exercise detail; would need to be promoted later |

**Choice**: `src/shared/ui/VideoPlayer.tsx` — zero extra cost now, avoids refactor later.

### Decision: react-native-youtube-iframe + WebView vs WebView-only

| Option | Tradeoff |
|--------|----------|
| Both (chosen) | Best UX for YouTube watch URLs (native player controls, less data); WebView fallback for other URLs |
| WebView-only | One dep, simpler, but YouTube UX is worse (browser chrome, more data, no native controls) |

**Choice**: Both. YouTube iframe for watch URLs; WebView for search URLs, Vimeo, or unparseable URLs. Seed data currently uses search URLs — they'll hit the WebView path until seed data is updated with real watch URLs.

### Decision: URL parsing strategy

A pure `parseVideoUrl(videoUrl: string | null): VideoUrlType` utility detects:
- `youtube.com/watch?v=ID` or `youtu.be/ID` → `{ type: "youtube", videoId: "ID" }`
- Any other URL → `{ type: "webview", url: string }`
- `null` / `""` → `{ type: "none" }`

## Component Design

```
VideoPlayer (videoUrl: string | null)
│
├── null/"" → return null (nothing rendered)
│
├── parseVideoUrl()
│   ├── type === "youtube"
│   │   └── YouTubeIframe (videoId, height, play)
│   │       ├── loading → ActivityIndicator overlay
│   │       ├── ready → show player, hide spinner
│   │       └── error → FallbackTextLink
│   │
│   └── type === "webview"
│       └── WebView (source={{ uri }})
│           ├── loading → ActivityIndicator overlay
│           ├── loaded → show WebView
│           └── error → FallbackTextLink
│
└── FallbackTextLink ("Watch on YouTube ↗")
    └── Linking.openURL(videoUrl)
```

### Styling

- Player height: 200px (proportional for 16:9)
- Border radius: `rounded-xl` (12px) via `className` — matches Card tokens
- Loading spinner: centered `ActivityIndicator` with `color="#A4A4A8"` (textMuted token)
- Fallback link: same style as current "Watch on YouTube ↗" text (no Card wrapper — lighter)

## Data Flow

```
ExerciseDetailScreen
  │
  ├── useExercise(id) → exercise: ExerciseRow | undefined
  │
  └── <VideoPlayer videoUrl={exercise.video_url} />
        │
        └── Internal: parseVideoUrl() → renders correct player type
```

No state changes needed in the screen — `VideoPlayer` is fully controlled via prop.

## File Changes

| File | Action | Lines |
|------|--------|-------|
| `src/shared/ui/VideoPlayer.tsx` | Create | ~70 |
| `src/shared/ui/__tests__/VideoPlayer.test.tsx` | Create | ~80 |
| `src/shared/ui/utils/parseVideoUrl.ts` | Create | ~30 |
| `src/shared/ui/utils/__tests__/parseVideoUrl.test.ts` | Create | ~40 |
| `src/features/exercises/screens/ExerciseDetailScreen.tsx` | Modify | −6, +5 (~11 affected) |
| `src/features/exercises/screens/__tests__/ExerciseDetailScreen.test.tsx` | Modify | ~+20 (new embed scenarios) |
| `package.json` | Modify | +2 deps |

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Unit | `parseVideoUrl` | Pure function — test YouTube ID extraction, search URL detection, null handling, arbitrary URL |
| Unit | `VideoPlayer` | Mock `react-native-youtube-iframe` `YouTubeIframe` and `react-native-webview` `WebView`. Test: null renders nothing, YouTube URL renders iframe, non-YouTube renders WebView, error shows fallback link |
| Integration | `ExerciseDetailScreen` | Mock `useExercise` + VideoPlayer. Test screen renders player in correct position, no gap when URL null, fallback link shows on error |

## Migration

No data migration needed. Seed URLs remain as-is (YouTube search URLs hit the WebView path). Future: optionally update seed data with real YouTube watch IDs to enable native iframe playback.

## Open Questions

- [ ] Consider updating seed URLs from search to actual watch URLs — not required for this change but would enhance UX
