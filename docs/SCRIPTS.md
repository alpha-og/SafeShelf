# Scripts Reference

All scripts available in the SafeShelf monorepo.

## pnpm Commands (Root `package.json`)

| Command | Description |
|---|---|
| `pnpm setup` | Install all JS and Python dependencies |
| `pnpm dev` | Start both backend and mobile dev servers concurrently |
| `pnpm dev:setup` | Full dev setup: prereq check + deps + SSL certs |
| `pnpm dev:android` | Build and deploy mobile app to Android device |
| `pnpm dev:ios` | Build and deploy mobile app to iOS device |
| `pnpm mobile:dev` | Start mobile Vite dev server only |
| `pnpm build` | Production build of mobile app |
| `pnpm typecheck` | TypeScript type checking |
| `pnpm lint` | Biome (mobile) + ruff (backend) |
| `pnpm format` | Biome format (mobile) + ruff format (backend) |
| `pnpm cap:sync` | Sync Capacitor native configs |
| `pnpm cap:android` | Open Android project in Android Studio |
| `pnpm backend:dev` | Start backend dev server only |
| `pnpm backend:serve` | Alias for `pnpm backend:dev` |
| `pnpm backend:sync` | Sync Python dependencies (uv sync) |
| `pnpm backend:seed` | Seed database (stores + inventory + recipes) |

## Mobile: `mobile/scripts/dev.mjs`

Unified CLI for mobile development workflow.

```
node scripts/dev.mjs <command>
node scripts/dev.mjs --help          # print help
```

### Subcommands

| Command | Description |
|---|---|
| `setup` | Check prerequisites, install deps, generate SSL certs with mkcert |
| `android` | Build web assets and deploy to connected Android device |
| `ios` | Build web assets and deploy to iOS simulator/device |

### Library Modules

| Module | Path | Description |
|---|---|---|
| `env` | `mobile/scripts/lib/env.mjs` | Loads `.env` files hierarchically (root → mobile → mobile.local) |
| `certs` | `mobile/scripts/lib/certs.mjs` | SSL certificate management via mkcert |
| `device` | `mobile/scripts/lib/device.mjs` | LAN IP detection, ADB device listing, deploy to device |
| `system` | `mobile/scripts/lib/system.mjs` | Prerequisite checks (node, pnpm, uv, mkcert, adb, xcodebuild) |
| `logger` | `mobile/scripts/lib/logger.mjs` | Colored console output (info, success, warn, error, table) |

## Backend: `backend/scripts/dev.py`

CLI dispatcher for database seeding and ingredient data generation.

```
uv run python -m scripts.dev <command> [options]
```

### Subcommands

#### `seed`

Seed database with stores, inventory, and/or recipes.

```
uv run python -m scripts.dev seed [--stores] [--inventory] [--recipes]
                                   [--csv-path PATH] [--limit N]
```

| Flag | Default | Description |
|---|---|---|
| `--stores` | `false` | Seed stores only |
| `--inventory` | `false` | Seed inventory only |
| `--recipes` | `false` | Seed recipes from Food.com dataset |
| `--csv-path` | `null` | Local path to recipes.csv (downloads via kagglehub if omitted) |
| `--limit` | `50000` | Max recipes to seed |

If none of `--stores`, `--inventory`, `--recipes` are specified, all three run.

#### `seed-ingredients`

Generate ingredient seed JSON files from recipe analysis + USDA nutrition data.

```
uv run python -m scripts.dev seed-ingredients [--top-n N] [--skip-usda] [--dry-run]
```

| Flag | Default | Description |
|---|---|---|
| `--top-n` | `200` | Number of top ingredients to process |
| `--skip-usda` | `false` | Skip USDA API lookup (empty nutrients) |
| `--dry-run` | `false` | Extract + normalize only; do not write seed files |

### Library Modules

| Module | Path | Description |
|---|---|---|
| `seed` | `backend/scripts/lib/seed.py` | DB seeding: 8 Kerala stores, OpenFoodFacts products, StoreInventory |
| `seed_recipes` | `backend/scripts/lib/seed_recipes.py` | Recipe seeding from Kaggle Food.com dataset |
| `generate_ingredient_seed` | `backend/scripts/lib/generate_ingredient_seed.py` | Ingredient normalization + USDA lookup + seed JSON generation |
| `generate_produce` | `backend/scripts/lib/generate_produce.py` | Fresh produce JSON seed generator (standalone) |
| `logger` | `backend/scripts/lib/logger.py` | Colored console output for Python scripts |
