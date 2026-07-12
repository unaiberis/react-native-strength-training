# Tasks: Embedded Video Player for Exercise Detail

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~240 (60 new + 110 create + 30 modify + 40 tests) |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

## Phase 1: Foundation — Install deps + create URL parser

- [ ] 1.1 Install `react-native-youtube-iframe` and `react-native-webview` (`npx expo install react-native-youtube-iframe react-native-webview`)
- [ ] 1.2 Create `src/shared/ui/utils/parseVideoUrl.ts` — pure function `parseVideoUrl(videoUrl: string | null): { type: "youtube" | "webview" | "none"; videoId?: string; url?: string }`
- [ ] 1.3 Write unit tests for `parseVideoUrl` in `src/shared/ui/utils/__tests__/parseVideoUrl.test.ts` — test YouTube watch URL, youtu.be, search URL, null, empty string, arbitrary URL

## Phase 2: VideoPlayer component

- [ ] 2.1 Create `src/shared/ui/VideoPlayer.tsx` — accepts `videoUrl: string | null`, renders YouTubeIframe or WebView with loading/error/null handling
- [ ] 2.2 Write `src/shared/ui/__tests__/VideoPlayer.test.tsx` — mock `YouTubeIframe` and `WebView`, test all states (null, YouTube, WebView, loading, error → fallback)

## Phase 3: Integration into ExerciseDetailScreen

- [ ] 3.1 Modify `src/features/exercises/screens/ExerciseDetailScreen.tsx` — replace `<Card>` with text link by `<VideoPlayer>` between description and Default Settings card; update imports
- [ ] 3.2 Update `src/features/exercises/screens/__tests__/ExerciseDetailScreen.test.tsx` — add test for `VideoPlayer` rendering in correct position; update existing tests (remove "Watch on YouTube" text assertions for YouTube URLs; keep null/error fallback assertions)

## Phase 4: Verification

- [ ] 4.1 Run `npx tsc --noEmit` — zero type errors
- [ ] 4.2 Run `npx jest --passWithNoTests --coverage` — all tests pass, 80% coverage on new/modified files
