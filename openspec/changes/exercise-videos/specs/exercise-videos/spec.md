# Delta for: exercise-video-player

## ADDED Requirements

### Requirement: VideoPlayer component renders inline video for YouTube watch URLs

The system SHALL provide a `VideoPlayer` component that accepts `videoUrl: string | null`. When `videoUrl` contains a YouTube watch URL (`youtube.com/watch?v=` or `youtu.be/`), the component SHALL extract the video ID and render a `react-native-youtube-iframe` player with a loading overlay.

#### Scenario: YouTube watch URL renders embedded player

- GIVEN `videoUrl` is `https://youtube.com/watch?v=dQw4w9WgXcQ`
- WHEN `VideoPlayer` renders
- THEN a YouTube iframe player SHALL appear with the video ID `dQw4w9WgXcQ`
- AND a loading indicator SHALL show until the iframe signals ready

#### Scenario: youtu.be short URL renders embedded player

- GIVEN `videoUrl` is `https://youtu.be/dQw4w9WgXcQ`
- WHEN `VideoPlayer` renders
- THEN the video ID `dQw4w9WgXcQ` SHALL be extracted and passed to the iframe

#### Scenario: YouTube search URL falls back to WebView

- GIVEN `videoUrl` is `https://youtube.com/results?search_query=bench+press`
- WHEN `VideoPlayer` renders
- THEN it SHALL NOT use `react-native-youtube-iframe` (no watchable video ID)
- AND it SHALL render the URL inside a `react-native-webview` WebView

### Requirement: VideoPlayer handles null/empty videoUrl gracefully

When `videoUrl` is `null` or empty string, the component SHALL render nothing (`null`) — no visible element, no placeholder, no layout shift.

#### Scenario: null videoUrl renders nothing

- GIVEN `videoUrl` is `null`
- WHEN `VideoPlayer` renders
- THEN no DOM/Screen element SHALL be created
- AND the parent layout SHALL be unchanged

### Requirement: VideoPlayer falls back to text link on error

If the YouTube iframe or WebView fails to load (network error, invalid URL, etc.), the component SHALL display the original "Watch on YouTube ↗" text link as a degraded fallback, opening via `Linking.openURL`.

#### Scenario: iframe error shows fallback text link

- GIVEN `videoUrl` is a valid YouTube URL
- WHEN the YouTube iframe fires an error event
- THEN the fallback text link "Watch on YouTube ↗" SHALL appear
- AND tapping it SHALL call `Linking.openURL(videoUrl)`

### Requirement: VideoPlayer is placed below description, above Default Settings

In `ExerciseDetailScreen`, the `VideoPlayer` SHALL render immediately after the exercise description (or after the name header if no description) and before the "Default Settings" card, within the ScrollView.

#### Scenario: video renders between description and settings

- GIVEN `ExerciseDetailScreen` loads with `video_url` set
- WHEN the screen renders
- THEN HTML layout order SHALL be: name → category badges → description → **VideoPlayer** → Default Settings card

## MODIFIED Requirements

### Requirement: Exercise detail shows video inline

The exercise detail screen SHALL display a video tutorial when `video_url` is present. The video SHALL appear inline within the detail view, between the description and the default settings card. When no video URL is available, no video section SHALL be shown.

(Previously: Video was rendered as a "Watch on YouTube ↗" text link inside a Card that called `Linking.openURL`.)

#### Scenario: Video embeds inline for YouTube watch URL

- GIVEN exercise has `video_url = "https://youtube.com/watch?v=dQw4w9WgXcQ"`
- WHEN `ExerciseDetailScreen` renders
- THEN the video SHALL appear as an embedded YouTube player between description and Default Settings
- AND no text link SHALL be visible

#### Scenario: Video renders as WebView for non-YouTube URL

- GIVEN exercise has `video_url = "https://vimeo.com/12345678"`
- WHEN `ExerciseDetailScreen` renders
- THEN the URL SHALL render inside a WebView between description and Default Settings
- AND no text link SHALL be visible

#### Scenario: No video when video_url is null

- GIVEN exercise has `video_url = null`
- WHEN `ExerciseDetailScreen` renders
- THEN Default Settings SHALL follow directly after the description (no gap) — same as previous behavior

#### Scenario: Video player error shows fallback link

- GIVEN exercise has `video_url = "https://youtube.com/watch?v=invalid"`
- WHEN the video player encounters an error
- THEN the fallback text link "Watch on YouTube ↗" SHALL appear
- AND tapping it SHALL navigate to the URL via `Linking.openURL`

## Edge Cases

| Case | Behavior |
|------|----------|
| `video_url` is empty string `""` | Treated as null — render nothing |
| URL is not YouTube and not loadable in WebView | Show "Watch on YouTube ↗" text link fallback |
| iframe is loading (slow network) | `ActivityIndicator` overlay centered on the player area |
| Component unmounts mid-load | Cleanup `react-native-youtube-iframe` via `onChange` reset |
| `react-native-webview` unavailable on platform | Text link fallback |
