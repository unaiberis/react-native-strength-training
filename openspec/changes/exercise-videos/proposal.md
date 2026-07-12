# Proposal: Embedded Video Player for Exercise Detail

## Intent

Replace the current text link ("Watch on YouTube ↗") in `ExerciseDetailScreen` with an embedded video player that plays tutorial clips inline. The `video_url` field already exists in PocketBase types and SQLite schema — this change adds a visual playback UI.

## Scope

### In
- Add `VideoPlayer` shared component at `src/shared/ui/VideoPlayer.tsx`
- Use `react-native-youtube-iframe` for YouTube watch URLs (`youtube.com/watch?v=`, `youtu.be/`)
- Use `react-native-webview` as fallback for non-YouTube URLs and YouTube search URLs (current seed format)
- Rewire `ExerciseDetailScreen` to use `VideoPlayer` instead of `Linking.openURL` text link
- Loading spinner overlay while iframe/WebView loads
- Error state: degraded to original text link if player fails
- Hide completely when `video_url` is null — no layout shift
- Unit tests for `VideoPlayer` + updated screen tests

### Out
- Coach exercise library video (can reuse component later — out of scope)
- Video upload or management in PocketBase
- Fullscreen toggle or swipe-to-dismiss (leveraging `react-native-youtube-iframe` defaults)
- Thumbnail/preview image before play

## Capabilities

### New Capabilities
- `exercise-video-player`: Inline video playback for exercise tutorials within the exercise detail screen

### Modified Capabilities
- `exercise-library`: Exercise detail screen changes from text-link to embedded video

## Approach

1. Install `react-native-youtube-iframe` + `react-native-webview` (peer dep)
2. Create `VideoPlayer` component: parse URL type, render YouTubeIframe or WebView with graceful fallback
3. Update `ExerciseDetailScreen` — replace `<Card>` with text link by `<VideoPlayer>` between description and Default Settings card
4. Add loading/error/null state handling
5. Update existing tests for the screen; add `VideoPlayer` component tests

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Seed data uses YouTube **search** URLs, not watch URLs — iframe can't play | High | Auto-detect: non-embed URLs fall back to WebView or text link |
| `react-native-youtube-iframe` adds native module — web build complexity | Medium | Library is Expo-compatible; WebView fallback for web |
| WebView embed fails on slow connections | Low | Degrade gracefully to original text link |

## Rollback Plan

Revert `ExerciseDetailScreen.tsx`, uninstall both packages, delete `VideoPlayer.tsx` and tests.

## Dependencies

- `react-native-youtube-iframe` (npm)
- `react-native-webview` (npm, peer dep)

## Success Criteria

- [ ] `VideoPlayer` renders YouTube embed for `youtube.com/watch?v=` URLs
- [ ] `VideoPlayer` renders WebView or fallback link for other URLs
- [ ] `ExerciseDetailScreen` shows no visual gap when `video_url` is null
- [ ] All existing + new tests pass at 80% coverage
- [ ] `npx tsc --noEmit` passes
