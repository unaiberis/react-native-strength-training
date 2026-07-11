# Delta for personal-records

## MODIFIED Requirements

### Requirement: Display

MUST show PRs grouped by exercise with type, value, date. PRs SHALL be surfaced as a "Personal Records" section within the Analytics tab instead of a standalone Progress tab. Auto-detection (1RM, e1RM Epley, volume, rep max) is unchanged.
(Previously: PRs were shown in a standalone Progress tab; the scenario referenced "WHEN progress opens".)

- GIVEN PRs across N exercises WHEN the Analytics tab (Personal Records section) is shown THEN grouped PRs with type/value/date are shown
- GIVEN a user with no PRs WHEN the Analytics tab (Personal Records section) is shown THEN an empty state is shown (not an error)
- GIVEN fresh install WHEN first workout THEN tracking resets and first qualifying sets become PRs

## Notes

- Navigation consequence: the standalone `progress` route/tab is removed. This is reflected by the relocated Display requirement above, not by a separate capability.
- e1RM computation is untouched: it remains available in Analytics per-exercise progression detail (`analytics/exercise/[id]`). No new requirement introduced.
