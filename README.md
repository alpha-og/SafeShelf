# SafeShelf

AI-powered grocery companion that analyzes product ingredients against user dietary constraints. Point your camera at a product label and get instant suitability feedback.

## Architecture

Monorepo with two packages:

- `backend/` — Python 3.14, FastAPI, SQLModel, asyncpg
- `mobile/` — React 19, TypeScript 6, Vite 8, TanStack Router, Capacitor 8

## Prerequisites

- Node.js >= 22
- pnpm
- Python 3.14
- uv

Optional:

- mkcert — locally-trusted HTTPS certs for device testing (recommended)
- adb — Android device deployment
- Xcode — iOS development

## Quick Start

```sh
pnpm setup              # install all dependencies
pnpm dev:setup          # full setup: prereqs + deps + SSL certs
pnpm dev                # start backend and mobile dev servers
```

Open `http://localhost:8826` in a browser, or deploy to a device:

```sh
pnpm dev:android        # build and deploy to Android device
pnpm dev:ios            # build and deploy to iOS device
```

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start backend and mobile dev servers |
| `pnpm dev:setup` | Prerequisite check, dependency install, SSL cert generation |
| `pnpm dev:android` | Build and deploy mobile app to Android device |
| `pnpm dev:ios` | Build and deploy mobile app to iOS device |
| `pnpm build` | Production build of mobile app |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Biome (mobile) + ruff (backend) |
| `pnpm backend:dev` | Start backend dev server only |
| `pnpm backend:sync` | Sync Python dependencies |

## Environment Configuration

Configuration is loaded hierarchically. Later files override earlier ones.

1. `/.env` — shared defaults
2. `/mobile/.env` or `/backend/.env` — sub-package overrides
3. `/mobile/.env.local` or `/backend/.env.local` — local-only overrides

See `.env.example` for available variables.

### Mobile SSL Certificates

HTTPS is required for camera access on physical devices. The `dev:setup` command uses [mkcert](https://github.com/FiloSottile/mkcert) to generate locally-trusted certificates.

| Variable | Default | Description |
|---|---|---|
| `MOBILE_TLS_ENABLED` | `true` | Enable HTTPS. Set to `false` for HTTP (disables camera on device). |
| `DEV_CERTS_MODE` | `auto` | `auto` uses mkcert if installed. `skip` falls back to Vite basicSsl. |
| `MOBILE_PORT` | `8826` | Dev server port. |

After setup, install the CA on your device (instructions printed by `dev:setup`).

## Project Structure

```
safeshelf/
├── backend/
│   ├── app/               # Feature modules
│   │   ├── router.py      # FastAPI APIRouter
│   │   ├── schemas.py     # Pydantic/SQLModel models
│   │   ├── service.py     # Business logic
│   │   └── __init__.py
│   └── pyproject.toml
├── mobile/
│   ├── src/
│   │   ├── routes/        # TanStack Router file-based routes
│   │   ├── features/      # Feature modules (auth, camera, cart, etc.)
│   │   ├── components/ui/ # shadcn/ui components
│   │   ├── providers/     # React context providers
│   │   ├── lib/           # API client, storage, utilities
│   │   └── hooks/         # Shared hooks
│   ├── scripts/
│   │   ├── dev.mjs        # Unified dev workflow script
│   │   └── lib/           # Supporting modules
│   └── capacitor.config.ts
├── package.json
└── pnpm-workspace.yaml
```
