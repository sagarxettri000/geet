# GEET — Modern Music Streaming, Powered by YouTube

> A premium, open-source music platform built with Next.js 16, Auth.js v5, and Prisma. Paste any YouTube link and play instantly — no YouTube API key required for core playback.

![Hero Placeholder](public/placeholder-hero.png)
*Hero — replace with screenshot of `/app` home feed.*

---

## Overview

GEET is a full-stack streaming experience: authenticated library, social catalog (tracks, artists, albums, playlists, genres), server-rendered home feed, and a hidden IFrame YouTube player with custom controls. The architecture is **provider-agnostic** (`TrackSource` + `MusicSource` interface) — YouTube is the first adapter, not a hard dependency.

Key principle: **keyless by default**. oEmbed and the IFrame Player API handle 90% of flows; the YouTube Data API is an optional accelerator.

## Features

- **Auth** — Credentials (bcrypt) + optional Google OAuth, JWT sessions, proxy-guarded routes (`src/proxy.ts:10`, `src/auth.ts:25`).
- **Catalog** — Tracks, Artists, Albums, Genres, Playlists with like/follow; full-text-ish search (`src/services/music.ts:136`).
- **Player** — Hidden IFrame (`src/components/player/YouTubePlayerHost.tsx:126`) + Zustand store (`src/stores/player.ts:50`); queue, shuffle, repeat, seek, volume.
- **Paste-a-link intake** — Any YouTube URL → oEmbed → `getOrCreateTrackFromVideo` (`src/services/catalog.ts:48`, `src/app/api/youtube/intake/route.ts:8`).
- **Home feed** — Hero, Continue Listening, Recently Played, Made for You, Trending, Mixes (`src/services/home.ts:5`).
- **Admin** — RBAC (`role: admin`), user ban via `bannedAt` (`prisma/schema.prisma:23`, `src/auth.ts:48`).
- **Personalization** — Listening history, recommendations (`src/services/recommendations.ts:9`), preferences & persisted queue.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, React 19 |
| Auth | Auth.js v5 (NextAuth) + PrismaAdapter, bcryptjs |
| DB / ORM | Prisma 6 — SQLite (dev) / Postgres (prod) |
| State | Zustand (player), SWR (data fetching) |
| Styling | Tailwind 4, class-variance-authority, motion |
| Validation | Zod |
| YouTube | IFrame Player API, oEmbed, optional Data API v3 |

## Quick Start

```bash
npm install
# 1. Configure env
cp .env.example .env
# Edit .env — set AUTH_SECRET: openssl rand -base64 32

# 2. Migrate & seed (creates 100+ tracks, artists, albums, demo playlists)
npx prisma migrate dev --name init
npm run db:seed        # prisma/seed.ts:204 — also creates demo users

# 3. Run
npm run dev            # http://localhost:3000
```

Prisma commands: `db:migrate` / `db:push` / `db:studio` — see `package.json:5`.

## Demo Accounts

Seeded in `prisma/seed.ts:208`:

| Role | Email | Password |
|---|---|---|
| User | `demo@geet.app` | `GeetDemo123!` |
| Admin | `admin@geet.app` | `GeetAdmin123!` |

Admin panel: `/admin` (proxy + server guard).

## YouTube Keyless Architecture

```
User pastes link → parseYouTubeInput (src/lib/youtube/video.ts:17)
                → fetchOEmbed (src/lib/youtube/oembed.ts:26) — no key
                → getOrCreateTrackFromVideo (src/services/catalog.ts:48)
                → Prisma Track + TrackSource
                → Zustand queue → YouTubePlayerHost loads videoId via IFrame API
```

Search enrichment via `searchYouTubeMusic` (`src/lib/youtube/data-api.ts:76`) is **gated** on `YOUTUBE_API_KEY`; catalog search (`src/services/music.ts:136`) always works locally.

Thumbnails: `src/lib/youtube/thumbnails.ts:16` — ordered fallback `maxres → default`.

## Project Structure

```
prisma/             schema.prisma, seed.ts, migrations/
src/
  app/              App Router (app/, admin/, (auth)/, api/)
    api/            REST handlers (auth, tracks, playlists, youtube/intake, search, home, admin)
  auth.ts           Auth.js config — credentials + Google, JWT callbacks
  proxy.ts          Route protection (replaces middleware)
  lib/
    db.ts           Prisma singleton
    youtube/        video.ts, oembed.ts, data-api.ts, thumbnails.ts
  services/         music.ts, catalog.ts, home.ts, recommendations.ts
  stores/           player.ts (Zustand)
  components/       player/, layout/, ui/
  types/            music.ts, next-auth.d.ts
public/
```

## Scripts

| Script | Command | Purpose |
|---|---|---|
| dev | `next dev` | Local dev server |
| build | `next build` | Production build |
| start | `next start` | Serve production |
| lint | `eslint` | Lint |
| typecheck | `tsc --noEmit` | Type check |
| db:migrate | `prisma migrate dev` | Create/apply migration |
| db:push | `prisma db push` | Push schema without migration |
| db:seed | `prisma db seed` | Run `prisma/seed.ts` |
| db:studio | `prisma studio` | Visual DB browser |

## Deployment

See `DEPLOYMENT.md`. Summary: push to Vercel, set env vars, switch `DATABASE_URL` to Postgres (Neon/Supabase), `prisma migrate deploy` on build.

## Screenshots

| View | Placeholder |
|---|---|
| Home feed | `![Home](public/screenshots/home.png)` |
| Player bar + queue | `![Player](public/screenshots/player.png)` |
| Search | `![Search](public/screenshots/search.png)` |
| Admin | `![Admin](public/screenshots/admin.png)` |

Replace placeholders in `public/screenshots/` before publishing.

## Docs

- `ARCHITECTURE.md` — layers, data flow, request lifecycle
- `SECURITY.md` — auth, RBAC, threat model
- `DATABASE.md` — schema & SQLite→Postgres
- `YOUTUBE.md` — provider adapter & IFrame player
- `DEPLOYMENT.md` — Vercel + Postgres

## License

Private — all rights reserved. YouTube playback complies with the IFrame Player API ToS; no downloading or scraping.
