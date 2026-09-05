# Architecture

GEET is a Next.js App Router monolith: server components + API routes share a single Prisma layer, guarded by Auth.js and a proxy. Client interactivity is isolated to Zustand (player) and SWR (fetching).

## 1. Layers

```
┌─────────────────────────────────────────────────┐
│  App Router (src/app)                           │
│  Server Components → RSC fetches via services    │
│  Client Components → HomeClient, PlayerBar, etc. │
├─────────────────────────────────────────────────┤
│  Proxy (src/proxy.ts:10) — auth gate             │
│  Auth.js (src/auth.ts:25) — JWT + PrismaAdapter │
├─────────────────────────────────────────────────┤
│  Services (src/services/*.ts)                    │
│  music.ts / catalog.ts / home.ts / recommendations.ts │
├─────────────────────────────────────────────────┤
│  YouTube Adapter (src/lib/youtube/*)             │
│  video.ts (parse) · oembed.ts (keyless)          │
│  data-api.ts (optional) · thumbnails.ts          │
├─────────────────────────────────────────────────┤
│  Prisma (src/lib/db.ts:7, prisma/schema.prisma)  │
│  Zustand (src/stores/player.ts:50)               │
└─────────────────────────────────────────────────┘
```

| Concern | File | Role |
|---|---|---|
| Routing / rendering | `src/app/layout.tsx`, `src/app/app/*` | RSC shells; client islands |
| Auth | `src/auth.ts:25`, `src/proxy.ts:10` | JWT session, credential + Google providers |
| DB access | `src/lib/db.ts:7`, `src/services/*` | Singleton PrismaClient, domain queries |
| Player | `src/stores/player.ts:50`, `src/components/player/YouTubePlayerHost.tsx:103` | Queue/state + hidden IFrame |
| Validation | `src/lib/validation.ts` | Zod schemas for signup, playlists, etc. |

## 2. Data Flow

**Read path (home feed):**
`RSC page (src/app/app/page.tsx)` → `buildHomeFeed(userId)` (`src/services/home.ts:5`) → parallel Prisma queries (`loadTrending`, `loadRecentlyPlayed`, etc.) → DTOs via `trackToDTO` (`src/services/music.ts:12`) → props to `HomeClient`.

**Write path (paste-a-link):**
`POST /api/youtube/intake` (`src/app/api/youtube/intake/route.ts:8`) → `parseYouTubeInput` (`src/lib/youtube/video.ts:17`) → `fetchOEmbed` (`src/lib/youtube/oembed.ts:26`) → `getOrCreateTrackFromVideo` (`src/services/catalog.ts:48`) → `TrackSource { provider: "youtube" }` → returns `trackToDTO`.

**Search:**
Local catalog (`src/services/music.ts:136`) via `searchCatalog` always; if `YOUTUBE_API_KEY` set, `searchYouTubeMusic` (`src/lib/youtube/data-api.ts:76`) merges external hits.

## 3. Player Flow

```
usePlayerStore.setQueue(tracks, index)        // src/stores/player.ts:64
  → currentTrack derived
  → YouTubePlayerHost watches currentTrack    // src/components/player/YouTubePlayerHost.tsx:228
  → getVideoId(track) extracts providerVideoId // src/components/player/YouTubePlayerHost.tsx:50
  → YT.Player.loadVideoById / cueVideoById   // src/components/player/YouTubePlayerHost.tsx:260
  → events: onReady / onStateChange / onError sync back to store (setStatus, setDuration)
  → 250ms poll syncs currentTime              // src/components/player/YouTubePlayerHost.tsx:320
  → next() on ENDED                           // src/components/player/YouTubePlayerHost.tsx:175
```

IFrame is hidden (`width:0 height:0` at `src/components/player/YouTubePlayerHost.tsx:352`); all UI is custom (seek, volume, shuffle via store actions).

## 4. Request Lifecycle

1. **Proxy** (`src/proxy.ts:10`) runs on every non-static, non-API request. Uses `auth()` to read JWT cookie without hitting DB. Redirects unauthenticated `/app`/`/admin` → `/login?callbackUrl=…`; authed `/` or `/login` → `/app`. No `middleware.ts` — Next 16 uses `proxy`.
2. **Route handler / RSC** calls `auth()` or `requireUser()` (`src/lib/auth-helpers.ts:3`) for session. API routes return `401` on failure; pages redirect.
3. **Service** executes Prisma queries (singleton `db` at `src/lib/db.ts:7`).
4. **Response** — RSC streams HTML; API routes return `NextResponse.json`.

Edge vs Node: `next.config.ts:4` marks `@prisma/client` + `bcryptjs` as `serverExternalPackages`; Prisma needs Node runtime (see `DEPLOYMENT.md`).

## 5. Proxy vs Auth

| Aspect | `src/proxy.ts` (formerly middleware) | `src/auth.ts` |
|---|---|---|
| When | Before route — edge-ish, fast | Inside route — full access |
| Sees | JWT via `req.auth` (no DB) | DB via `PrismaAdapter`, `authorize` callback |
| Decides | Redirect vs `NextResponse.next()` | `authorize` returns user or null; `jwt`/`session` callbacks enrich token |
| Knows | Paths (`publicPaths`, `/app`, `/admin`) | Credentials, `bannedAt` check (`src/auth.ts:48`), bcrypt compare |

Proxy is the **gate**; `auth.ts` is the **source of truth**. Admin pages double-check `session.user.role` server-side even after proxy pass (`src/app/admin/layout.tsx`).

## 6. Cross-Cutting Concerns

- **DTOs** — `trackToDTO`/`artistToDTO`/`playlistToDTO` (`src/services/music.ts:12`) normalize Prisma models + attach `sources`, `isLiked`, `thumbnailUrl` fallback.
- **Validation** — Zod at API boundary (`src/app/api/auth/signup/route.ts:14`, `credentialsSchema` at `src/auth.ts:9`).
- **Caching** — `fetch` in `data-api.ts:139` uses default no-store; home feed is dynamic per user.
- **Extensibility** — `TrackSource.provider` is a string discriminator (`prisma/schema.prisma:162`); adding `spotify` means new adapter implementing the same `MusicSource` shape.
