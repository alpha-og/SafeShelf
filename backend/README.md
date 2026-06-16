# SafeShelf Backend

FastAPI application with SQLModel ORM and asyncpg for PostgreSQL (SQLite fallback for development).

## Tech Stack

- Python 3.14
- FastAPI
- SQLModel (SQLAlchemy + Pydantic)
- asyncpg (PostgreSQL) / aiosqlite (development)
- JWT auth with refresh tokens
- uvicorn

## Quick Start

```sh
pnpm backend:sync       # uv sync — install Python dependencies
pnpm backend:dev        # start dev server on port 8926
```

Or from the project root:

```sh
pnpm dev                # starts both backend and mobile
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BACKEND_PORT` | `8926` | Server port |
| `BACKEND_HOST` | `localhost` | Server bind address |
| `DATABASE_URL` | — | PostgreSQL URL. Uses SQLite if not set. |

See `/backend/.env.example` and `/.env.example` for all options.

## API

All endpoints are prefixed with `/v1/{feature}`.

| Prefix | Description |
|---|---|
| `/v1/auth` | Signup, signin, refresh, logout |
| `/v1/products` | Search, identify |
| `/v1/cart` | Cart CRUD |
| `/v1/analysis` | Product suitability analysis |
| `/v1/profiles` | User dietary profiles |
| `/v1/guidelines` | Dietary guidelines |

Response format (2xx):

```json
{
  "success": true,
  "data": { ... },
  "metadata": { ... }
}
```

Error format (RFC 7807):

```json
{
  "success": false,
  "type": "https://example.com/errors/...",
  "title": "...",
  "status": 400,
  "detail": "...",
  "instance": "..."
}
```

## Architecture

The application is organized into feature modules under `app/`. Each module contains:

- `router.py` — FastAPI APIRouter with route definitions
- `schemas.py` — Pydantic/SQLModel models
- `service.py` — Business logic

Database tables are created on startup via the lifespan handler. Sessions are injected via FastAPI dependency (`get_session`).

Auth uses JWT access tokens (Bearer header) and refresh tokens (httpOnly cookie, path `/v1/auth`).

## Database

SQLite is used by default for development. Set `DATABASE_URL` to a PostgreSQL connection string for production-like environments. Tables are auto-created on application startup.
