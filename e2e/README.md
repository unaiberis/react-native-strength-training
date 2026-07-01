# E2E Tests — Maestro

## Setup

```bash
# Install Maestro CLI
curl -Ls 'https://get.maestro.mobile.dev' | bash

# Add to PATH
export PATH="$PATH:$HOME/.maestro/bin"
```

## Run

```bash
# Start Android emulator first, then:
maestro test .maestro/

# Run single flow:
maestro test .maestro/critical-path.yaml
```

## CI Integration

The flows run via `maestro test .maestro/` when an Android emulator is available.
CI step is non-blocking — failures don't fail the build.

## Prerequisites

- Android emulator with API 34+
- App built with `npx expo run:android`
- `EXPO_PUBLIC_OFFLINE_ENABLED=true` in .env
- Test user credentials configured in CI secrets
