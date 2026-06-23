# SafeShelf

AI-powered grocery companion that analyzes product ingredients against user dietary constraints.

## Prerequisites

- Node.js >= 22, pnpm
- Python 3.14, uv
- mkcert (recommended for device testing)
- adb (Android deployment) / Xcode (iOS development)

## Quick Start

```sh
pnpm setup              # install all dependencies
pnpm dev:setup          # full setup: prereqs + deps + SSL certs
pnpm dev                # start backend (8926) and mobile (8826) dev servers
```

Open `http://localhost:8826` in a browser, or deploy to a device:

```sh
pnpm dev:android        # build and deploy to Android device
pnpm dev:ios            # build and deploy to iOS device
```

## Common Commands

| Command | Description |
|---|---|---|
| `pnpm dev` | Start backend and mobile dev servers |
| `pnpm dev:setup` | Prerequisite check, dependency install, SSL cert generation |
| `pnpm dev:android` | Build and deploy mobile app to Android device |
| `pnpm dev:ios` | Build and deploy mobile app to iOS device |
| `pnpm build` | Production build of mobile web assets |
| `pnpm build:android` | Build bundled APK and install on Android device |
| `pnpm build:ios` | Build bundled app and deploy to iOS simulator/device |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Biome (mobile) + ruff (backend) |
| `pnpm backend:dev` | Start backend dev server only |

See [docs/SCRIPTS.md](docs/SCRIPTS.md) for the full script reference.

## Environment Configuration

Loaded hierarchically — later files override earlier ones:

1. `/.env` — shared defaults
2. `/mobile/.env` or `/backend/.env` — sub-package overrides
3. `/mobile/.env.local` or `/backend/.env.local` — local overrides

See [docs/ENV_VARS.md](docs/ENV_VARS.md) for the complete environment variable reference.

### Mobile SSL

HTTPS is required for camera access on physical devices. The `dev:setup` command uses [mkcert](https://github.com/FiloSottile/mkcert) to generate locally-trusted certificates.

| Variable | Default | Description |
|---|---|---|
| `MOBILE_TLS_ENABLED` | `true` | Enable HTTPS. `false` for HTTP (disables camera on device). |
| `DEV_CERTS_MODE` | `auto` | `auto` = mkcert; `skip` = Vite basicSsl fallback |
| `MOBILE_PORT` | `8826` | Dev server port |

After setup, install the CA on your device (instructions printed by `dev:setup`).

## Architecture

See [AGENTS.md](AGENTS.md) for detailed architecture, project structure, and backend/mobile internals.
