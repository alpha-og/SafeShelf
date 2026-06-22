# SafeShelf — AGENTS.md

## Rules

- Do not build the frontend or backend without explicit permission.
- Git commits must follow Conventional Commits format, be a single line, and have no description/body.
- When launching a dev server (frontend or backend), always set a timeout of at least 60 seconds so the process can start and stay alive during development.

## Structure

```
safeshelf/
├── backend/        # Python 3.14 — FastAPI + SQLModel + asyncpg
│   ├── app/        # Feature modules: auth, analysis, cart, guidelines,
│   │   #   conditions, products, profiles, recipes, sessions, stores
│   │   ├── api/         # API v1 router
│   │   ├── router.py    # FastAPI APIRouter with prefix
│   │   ├── schemas.py   # Pydantic/SQLModel models
│   │   ├── service.py   # Business logic
│   │   └── __init__.py
│   └── pyproject.toml   # Entrypoint: `uv run python -m app`
├── backend/app/api/     # API v1 endpoints routing
└── mobile/         # React 19 + TypeScript 6 + Vite 8 + TanStack Router
    ├── src/
    │   ├── routes/       # File-based routes; routeTree.gen.ts is auto-generated
    │   ├── features/     # Feature modules (e.g. auth/)
    │   ├── components/   # shadcn/ui components (button, card, input)
    │   ├── providers/    # React context providers (AuthProvider)
    │   ├── assets/       # Static assets (images, fonts)
    │   ├── lib/          # API client, storage, utils
    │   └── hooks/        # Shared hooks (useAuth)
    └── scripts/
        ├── dev.mjs       # Unified dev CLI (setup, android, ios)
        └── lib/          # Supporting modules (logger, env, system, certs, device)
```

## Commands

| Action | Command |
|---|---|
| Setup everything | `pnpm setup` (pnpm install + uv sync) |
| Full dev setup + SSL certs | `pnpm dev:setup` or `node mobile/scripts/dev.mjs setup` |
| Mobile dev server (port 8826) | `pnpm mobile:dev` |
| Mobile build | `pnpm build` |
| TypeScript check | `pnpm typecheck` (runs `tsc -b`) |
| Lint | `pnpm lint` (Biome) |
| Capacitor sync | `pnpm cap:sync` |
| Capacitor Android | `pnpm cap:android` |
| Deploy to Android device | `pnpm dev:android` or `node mobile/scripts/dev.mjs android` |
| Deploy to iOS device | `pnpm dev:ios` or `node mobile/scripts/dev.mjs ios` |
| Backend dev server (port 8926) | `pnpm backend:dev` or `pnpm backend:serve` |
| Backend sync deps | `pnpm backend:sync` (uv sync) |
| Generate ingredient seed JSON | `uv run python -m scripts.lib.generate_ingredient_seed` or `uv run python -m scripts.dev seed-ingredients` |
| Dry-run ingredient generation | `uv run python -m scripts.dev seed-ingredients --dry-run` |
| Seed DB (stores + inventory + recipes) | `uv run python -m scripts.dev seed` |
| Data setup (guidelines + embeddings) | `pnpm backend:data:setup` |
| Data setup (remote DB + upload chroma) | `pnpm backend:data:setup -- --remote` |
| Data setup (guidelines only) | `pnpm backend:data:setup -- --guidelines` |
| Data setup (embeddings only) | `pnpm backend:data:setup -- --embeddings` |

See [docs/SCRIPTS.md](docs/SCRIPTS.md) for full script documentation including subcommand flags and library modules.

## Configuration

Environment variables are loaded hierarchically:

1. **`/.env`** — shared defaults (root, tracked in `.env.example`)
2. **`/backend/.env`** / **`/mobile/.env`** — sub-package overrides
3. **`/backend/.env.local`** / **`/mobile/.env.local`** — local-only overrides (gitignored)

Later values override earlier ones. Each sub-package can have its own `.env` for private secrets. See `/.env.example` or the full reference at [docs/ENV_VARS.md](docs/ENV_VARS.md). Mobile-only variables are documented in `mobile/.env.example`.

## Backend

- **Package manager**: `uv` (not pip/poetry). Python 3.14 required.
- **Entrypoint**: `uv run python -m app` → `app/__init__.py:run_cli()` → uvicorn on `app.main:app`
- **Config**: `.env` / `.env.local` read by `app/shared/config.py` via pydantic-settings
- **DB**: SQLModel + asyncpg. Tables auto-created on startup via lifespan. Session injected via `get_session` dependency.
- **Auth**: JWT access tokens (in-memory, `Bearer` header) + refresh tokens (httpOnly cookie, path `/v1/auth`). Auto-refresh in mobile Axios interceptor.
- **API envelope**: All 2xx JSON responses wrapped as `{"success": true, "data": …, "metadata": …}` by `ResponseEnvelopeMiddleware`. Error responses use RFC 7807: `{"success": false, "type": …, "title": …, "status": …, "detail": …, "instance": …}`.
- **Most services are stubs** — raise `HTTPException(501)`. Implementation needed.
- **Endpoints**: `/v1/{feature}/…`. Auth routes at `/v1/auth`.

## Mobile

- **Package manager**: pnpm (workspace root). `pnpm-lock.yaml` at root.
- **TanStack Router** — routes are files under `src/routes/`. After adding/renaming a route file, restart dev server to regenerate `src/routeTree.gen.ts`.
- **QueryClient** configured with `retry: 1, staleTime: 30_000`.
- **Auth flow**: `AuthProvider` wraps the app. On 401, Axios interceptor tries `/v1/auth/refresh` with cookie, queues concurrent requests. Failure clears token and triggers logout.
- **Token storage**: Capacitor SQLite on native, `localStorage` fallback in browser.
- **Tailwind CSS v4** — no config file. Theme vars in `src/index.css` via `@theme` directive.
- **shadcn/ui** — components in `src/components/ui/`. `components.json` at mobile root.
- **Path alias**: `@/` → `src/` (Vite resolve + tsconfig paths).
- **Vite proxy**: `/v1` → `http://localhost:8926` in dev.
- **Dev scripts**: Unified `scripts/dev.mjs` with subcommands (`setup`, `android`, `ios`). Supports `MOBILE_TLS_ENABLED` and `DEV_CERTS_MODE` env vars for SSL opt-out.
- **SSL certs**: `dev:setup` uses mkcert for trusted HTTPS. CA must be installed on Android device (pushed via adb). iOS simulator trusts macOS keychain.
- **Android network config**: `res/xml/network_security_config.xml` trusts user-installed CAs in debug builds.
