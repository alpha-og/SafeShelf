# SafeShelf — AGENTS.md

## Structure

```
safeshelf/
├── backend/        # Python 3.14 — FastAPI + SQLModel + asyncpg
│   ├── app/        # Feature modules: auth, analysis, cart, guidelines,
│   │               #   products, profiles, recipes, sessions, stores
│   │   ├── router.py    # FastAPI APIRouter with prefix
│   │   ├── schemas.py   # Pydantic/SQLModel models
│   │   ├── service.py   # Business logic
│   │   └── __init__.py
│   └── pyproject.toml   # `serve` entrypoint → app:run_cli
└── mobile/         # React 19 + TypeScript 6 + Vite 8 + TanStack Router
    └── src/
        ├── routes/       # File-based routes; routeTree.gen.ts is auto-generated
        ├── features/     # Feature modules (e.g. auth/)
        ├── components/   # shadcn/ui components (button, card, input)
        ├── providers/    # React context providers (AuthProvider)
        ├── lib/          # API client, storage, utils
        └── hooks/        # Shared hooks (useAuth)
```

## Commands

| Action | Command |
|---|---|
| Mobile dev server (port 5173) | `pnpm dev` or `pnpm mobile:dev` |
| Mobile build | `pnpm build` |
| TypeScript check | `pnpm typecheck` (runs `tsc -b`) |
| Lint | `pnpm lint` (ESLint) |
| Capacitor sync | `pnpm cap:sync` |
| Capacitor Android | `pnpm cap:android` |
| Backend dev server (port 8926) | `pnpm backend:dev` or `pnpm backend:serve` |
| Backend sync deps | `pnpm backend:sync` (uv sync) |

## Backend

- **Package manager**: `uv` (not pip/poetry). Python 3.14 required.
- **Entrypoint**: `uv run serve` → `app/__init__.py:run_cli()` → uvicorn on `app.main:app`
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
