# SafeShelf Mobile

Capacitor mobile app built with React 19, Vite 8, TanStack Router, and Tailwind CSS 4.

## Tech Stack

- React 19
- TypeScript 6
- Vite 8
- TanStack Router (file-based routing)
- TanStack Query
- Tailwind CSS 4
- Capacitor 8 (native runtime)
- shadcn/ui components

## Quick Start

```sh
pnpm mobile:dev         # start Vite dev server on port 8826
pnpm dev:android        # build and deploy to Android device
pnpm dev:ios            # build and deploy to iOS device
```

## Dev Workflow

The `scripts/dev.mjs` script manages the development lifecycle.

### Setup

```sh
node scripts/dev.mjs setup
```

Checks prerequisites, installs dependencies, and generates SSL certificates via mkcert.

### Device Deployment

```sh
node scripts/dev.mjs android
node scripts/dev.mjs ios
```

Builds the app, copies native assets, and launches on the connected device with the dev server URL configured automatically.

## SSL Certificates

HTTPS is required for camera access on physical devices. Setup uses mkcert to generate locally-trusted certificates.

| Variable | Default | Description |
|---|---|---|
| `MOBILE_TLS_ENABLED` | `true` | Enable HTTPS. `false` uses HTTP (disables camera on device). |
| `DEV_CERTS_MODE` | `auto` | `auto` uses mkcert if installed. `skip` uses Vite basicSsl fallback. |
| `MOBILE_PORT` | `8826` | Dev server port |

After setup:
- Android: Install the mkcert CA (instructions printed by `dev:setup`)
- iOS simulator: Already trusted (inherits macOS keychain)
- iOS device: AirDrop CA cert and install as profile

## Project Structure

```
src/
├── routes/               # TanStack Router file-based routes (auto-generated routeTree.gen.ts)
│   ├── __root.tsx        # Root layout with safe area handling
│   ├── _auth.tsx         # Auth layout (signin, signup)
│   ├── _authenticated.tsx # Authenticated layout (index, cart, history, settings)
│   └── ...
├── features/             # Feature modules
│   ├── auth/             # Signin, signup
│   ├── camera/           # Barcode scanning, product photo
│   ├── cart/             # Shopping cart
│   ├── history/          # Scan history
│   ├── products/         # Product detail, product sheet
│   └── settings/         # Settings, appearance, preferences, constraints
├── components/ui/        # shadcn/ui components (button, card, input, etc.)
├── providers/            # React context providers (AuthProvider, ThemeProvider, CartProvider)
├── lib/                  # API client (axios), storage, utilities
└── hooks/                # Shared hooks (useAuth, useCart)
```

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint |
| `pnpm cap:sync` | Sync Capacitor native configs |
| `pnpm cap:android` | Open Android project in Android Studio |
| `pnpm cap:ios` | Open iOS project in Xcode |
| `pnpm dev:setup` | Full environment setup |
| `pnpm dev:android` | Deploy to Android device |
| `pnpm dev:ios` | Deploy to iOS device |

## Key Configuration

- `capacitor.config.ts` — App ID, name, Android scheme, dev server URL via `CAP_SERVER_URL` env
- `vite.config.ts` — Dev server host/port/TLS, backend proxy, path aliases (`@/` → `src/`)
- `src/index.css` — Tailwind theme vars (`@theme`), safe area CSS custom properties

## Authentication

JWT access tokens (Bearer header) with refresh tokens (httpOnly cookie, path `/v1/auth`). The `AuthProvider` wraps the app. On 401, an Axios interceptor attempts a refresh; if that fails, the user is redirected to sign-in.

Token storage uses Capacitor SQLite on native, localStorage fallback in browser.
