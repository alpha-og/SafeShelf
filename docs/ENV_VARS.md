# Environment Variables

Single source of truth for all environment variables across the SafeShelf monorepo.

## Loading Hierarchy

Later files override earlier ones:

| Order | File | Status |
|---|---|---|
| 1 | `/.env` | Tracked (`.env.example`) |
| 2 | `/backend/.env` or `/mobile/.env` | Tracked (`.env.example`) |
| 3 | `/backend/.env.local` or `/mobile/.env.local` | Gitignored |

## Backend (`backend/app/shared/config.py`)

| Variable | Default | Description |
|---|---|---|
| `BACKEND_HOST` | `localhost` | Server bind address |
| `BACKEND_PORT` | `8926` | Server port |
| `DATABASE_URL` | `postgresql+asyncpg://user:password@host:5432/dbname` | Database URL. Uses SQLite if set to `sqlite+aiosqlite:///./safe-shelf-dev.db` |
| `SECRET_KEY` | `change-me-to-a-random-secret` | JWT signing key (change in production) |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Access token lifetime in minutes |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime in days |
| `COOKIE_SECURE` | `true` | Set `Secure` flag on cookies. Set `false` for local HTTP dev. |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:8826` | Comma-separated allowed CORS origins |
| `DEBUG` | `true` | Enable hot reload / debug mode |
| `DB_ECHO` | `false` | Log all SQL queries |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `GROQ_API_KEY` | — | Groq LLM API key |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Groq model identifier |
| `WHO_CLIENT_ID` | — | WHO ICD API client ID |
| `WHO_CLIENT_SECRET` | — | WHO ICD API client secret |
| `USDA_FDC_API_KEY` | — | USDA FoodData Central API key (free signup) |

## Mobile — Vite Dev Server (`mobile/vite.config.ts`)

| Variable | Default | Description |
|---|---|---|
| `MOBILE_PORT` | `8826` | Dev server port |
| `MOBILE_PREVIEW_HOST` | `true` | `true` (all interfaces), `false` (localhost), or an IP/domain string |
| `MOBILE_ALLOWED_HOSTS` | `true` | `true` (any host), `false` (none), or comma-separated list of allowed hosts |
| `MOBILE_TLS_ENABLED` | `true` | Enable HTTPS. Set to `false` for HTTP (disables camera on device). |
| `VITE_PROXY_TARGET` | `http://localhost:8926` | Target URL for the `/v1` API proxy. Match to your backend address. |

## Mobile — Dev Script (`mobile/scripts/dev.mjs`)

| Variable | Default | Description |
|---|---|---|
| `DEV_CERTS_MODE` | `auto` | `auto` = use mkcert if available; `skip` = rely on Vite basicSsl fallback |
| `MOBILE_TLS_ENABLED` | `true` | Controls SSL cert generation |
| `MOBILE_PORT` | `8826` | Dev server port (used to construct CAP_SERVER_URL) |

## Mobile — Other

| Variable | Set by | Description |
|---|---|---|
| `CAP_SERVER_URL` | `dev.mjs` dynamically | Tells Capacitor which dev server URL to load |

## Script Utilities

| Variable | Used by | Description |
|---|---|---|
| `CI` | `mobile/scripts/lib/logger.mjs` | When set, disables colored output |
| `NO_COLOR` | `backend/scripts/lib/logger.py` | When set, disables colored output |

## Legacy / Backward Compatible

The backend config also accepts these alternative names (via `AliasChoices`):

| Preferred | Legacy |
|---|---|
| `BACKEND_HOST` | `HOST` |
| `BACKEND_PORT` | `PORT` |

Use the preferred names in new deployments and documentation.
