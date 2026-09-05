# Deployment

GEET is a standard Next.js 16 app. Recommended target is **Vercel** (zero-config) with a managed Postgres (Neon, Supabase, or Vercel Postgres).

## 1. Vercel — One-Click Deploy

1. **Push** the repo to GitHub.
2. **Import** in Vercel: `New Project → Import Git Repository → GEET`.
3. **Framework preset:** Next.js (auto-detected).
4. **Build settings** (defaults are correct):
   - Build command: `npm run build` (or `prisma migrate deploy && next build` — see §3)
   - Output directory: `.next`
   - Install command: `npm install`
   - Node: 20.x (set in Vercel → Settings → Node)
5. **Environment variables** — add in Vercel Dashboard → Settings → Environment Variables (per env: Production/Preview/Development):

| Var | Required | Value |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/geet?sslmode=require` |
| `AUTH_SECRET` | Yes | `openssl rand -base64 32` output |
| `AUTH_URL` | Yes | `https://your-app.vercel.app` (prod) |
| `NEXT_PUBLIC_APP_URL` | Yes | Same as `AUTH_URL` |
| `YOUTUBE_API_KEY` | No | Google API key restricted to YouTube Data API v3 |
| `AUTH_GOOGLE_ID` | No | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | No | Google OAuth client secret |

6. **Deploy** — Vercel builds and assigns a URL.

## 2. Environment Variables

- `DATABASE_URL` is read by both Prisma (`prisma/schema.prisma:6`) and `src/lib/db.ts:7`. Local `file:./prisma/dev.db` must be replaced before deploying — Vercel has no persistent disk for SQLite.
- `AUTH_URL` / `NEXT_PUBLIC_APP_URL` must be the **canonical production URL** (no trailing slash) for Auth.js callbacks to match. For OAuth, add `https://your-app.vercel.app/api/auth/callback/google` as an Authorized redirect URI in Google Cloud Console.
- `AUTH_SECRET` must be a strong random string. Rotate by regenerating and redeploying (invalidates old JWTs).
- All secrets are server-only except `NEXT_PUBLIC_APP_URL` (prefixed `NEXT_PUBLIC_` — exposed to client).

## 3. Prisma on Vercel

**Switch provider:**

```prisma
// prisma/schema.prisma:4
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Use a Postgres provider:

- **Neon** — free tier, branch per preview deploy. Copy pooled connection string.
- **Supabase** — set `DATABASE_URL` to Transaction pooler URL (port 6543) + `?pgbouncer=true`.
- **Vercel Postgres** — `vercel postgres create` → auto-injects `DATABASE_URL`.

**Migrations vs push:**

- Preferred: set Build Command to `prisma migrate deploy && next build` or add a `vercel-build` script. This applies committed migrations (`prisma/migrations/*`).
- Quick start (no migrations committed): `prisma db push` then `prisma db seed`. Not recommended for prod.

**Seed in production:**

```bash
# One-off after first deploy (locally with prod DATABASE_URL set):
DATABASE_URL="postgresql://..." npm run db:seed
```

Or add a Vercel Cron / manual `vercel env` + `npx prisma db seed` via Vercel CLI.

**Prisma config:** `next.config.ts:4` lists `serverExternalPackages: ["@prisma/client", "bcryptjs"]` so Next does not bundle them — required for Prisma's native engine on Vercel's Node runtime.

## 4. Build Command

Default `npm run build` (`next build`) suffices if migrations are run separately. For CI-safe deploys, use:

```json
// package.json
"vercel-build": "prisma migrate deploy && next build"
```

Then set Vercel Build Command to `npm run vercel-build`.

Caching: `prisma generate` runs automatically via `postinstall` or `prisma` dependency; no need to call manually.

## 5. Runtime — Proxy

`src/proxy.ts:10` uses `export const proxy = auth(...)` + `export const config = { matcher: [...] }` (`src/proxy.ts:57`).

- Next 16 renames `middleware` → `proxy`. File is `src/proxy.ts` (not `src/middleware.ts`).
- The proxy runs on the **Node runtime** (needs `auth()` + JWT verification). No `edge` export — Vercel runs it as a lightweight Node middleware.
- Matcher excludes `_next/static`, `_next/image`, `favicon.ico`, and asset extensions (`src/proxy.ts:58`).
- `/api/*` is short-circuited inside the proxy (`src/proxy.ts:16`) but also guarded per-route via `requireUser`/`requireAdmin` (`src/lib/auth-helpers.ts:3`).

If you add an `edge` runtime route, keep it out of `/app`/`/admin` and handle auth explicitly.

## 6. Post-Deploy Checklist

- [ ] `DATABASE_URL` points to Postgres, not `file:`.
- [ ] `prisma migrate deploy` succeeded (check build logs).
- [ ] `AUTH_URL` and `NEXT_PUBLIC_APP_URL` equal the deployed URL.
- [ ] If Google OAuth enabled, redirect URI registered in GCP.
- [ ] `YOUTUBE_API_KEY` restricted to YouTube Data API v3 (HTTP referrer = your domain).
- [ ] Seed ran once (verify `demo@geet.app` login).
- [ ] Test unauthenticated redirect: `/app` → `/login`, then login → `/app`.
- [ ] Test admin gate: `demo@geet.app` → `/admin` redirects to `/app`.
- [ ] Images load from `i.ytimg.com` (`next.config.ts:6` remotePatterns).

## 7. Non-Vercel Deploy (Docker / Self-Host)

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start  # listens on $PORT (default 3000)
```

Set the same env vars. Ensure `DATABASE_URL` is reachable and `AUTH_URL` matches the reverse proxy origin. Use PM2 or systemd for process management.
