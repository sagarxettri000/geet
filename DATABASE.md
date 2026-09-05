# Database

GEET uses **Prisma 6** with a single `schema.prisma` targeting SQLite locally and PostgreSQL in production — no schema fork.

## 1. Schema Overview

`prisma/schema.prisma:4` — `provider = "sqlite"`, `url = env("DATABASE_URL")`.

### Auth (Auth.js v5)

| Model | Key field | Notes |
|---|---|---|
| `User` (`prisma/schema.prisma:15`) | `email @unique`, `role`, `bannedAt` | `password` nullable for OAuth users |
| `Account` (`prisma/schema.prisma:58`) | `@@unique([provider, providerAccountId])` | Google linkage |
| `Session` (`prisma/schema.prisma:78`) | `sessionToken @unique` | Used only if DB session strategy (currently JWT) |
| `VerificationToken` (`prisma/schema.prisma:87`) | `@@id([identifier, token])` | Future email verify |
| `Profile` (`prisma/schema.prisma:47`) | `userId @unique` | `favoriteArtists` JSON array |

### Music Catalog

| Model | Purpose |
|---|---|
| `Genre` (`prisma/schema.prisma:97`) | Unique `name`/`slug`, color |
| `Artist` (`prisma/schema.prisma:108`) | `normalizedName @unique`, `followers`, `monthlyListeners`, `verified` |
| `Track` (`prisma/schema.prisma:129`) | `title`, `artistName`, `durationSec`, `thumbnailUrl`, `popularity`, `genreId` |
| `TrackSource` (`prisma/schema.prisma:157`) | `provider` + `providerVideoId` (`@@unique`), `metadata` JSON, keyless adapter |
| `Album` (`prisma/schema.prisma:175`) | `artistId`, `year`, `type` (album/single/ep/compilation) |
| `AlbumTrack` (`prisma/schema.prisma:195`) | Join with `position`, `@@unique([albumId, trackId])` |
| `FeaturedContent` (`prisma/schema.prisma:401`) | `section` (hero/trending), polymorphic refs |

### User Library

`Playlist` (`prisma/schema.prisma:210`) + `PlaylistTrack` (`prisma/schema.prisma:230`) with `position`; `LikedTrack`/`LikedAlbum`/`LikedPlaylist`/`FollowedArtist` are composite-PK join tables; soft delete via `Playlist.deletedAt`.

### Activity & State

`ListeningHistory` (`prisma/schema.prisma:291`), `RecentlyPlayed` (`prisma/schema.prisma:308`), `SearchHistory` (`prisma/schema.prisma:320`), `UserPreference` (`prisma/schema.prisma:333`), `Queue` (`prisma/schema.prisma:349` — `trackIds` JSON + `currentIndex`), `Notification`, `Device`, `Report`, `AnalyticsEvent`.

## 2. Relations (text diagram)

```
User 1──1 Profile
User 1──* Account / Session / Playlist / Report
User *──* Track    via LikedTrack
User *──* Album    via LikedAlbum
User *──* Playlist via LikedPlaylist
User *──* Artist   via FollowedArtist
User 1──* ListeningHistory / RecentlyPlayed / SearchHistory
User 1──1 UserPreference / Queue

Artist 1──* Track / Album
Track *──* Album  via AlbumTrack
Track 1──* TrackSource (provider=youtube today)
Playlist 1──* PlaylistTrack ──1 Track
Genre 1──* Track
FeaturedContent ──o Track / Artist / Album / Playlist
```

Indexes on `Track.title`, `Artist.name`, `ListeningHistory(userId, playedAt)`, `Notification(userId, read, createdAt)`, etc.

## 3. SQLite → Postgres Migration

The schema is provider-portable — only `datasource` changes. Steps:

1. **Update `prisma/schema.prisma:5`:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Set `DATABASE_URL`** to Postgres (Neon/Supabase/Vercel Postgres), e.g.:
   ```
   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/geet?sslmode=require"
   ```
3. **Migrate:**
   ```bash
   npx prisma migrate deploy   # production — applies existing migrations
   # or for fresh DB:
   npx prisma migrate dev --name init
   ```
4. **Runtime:** Prisma Client works unchanged (`src/lib/db.ts:7`). Ensure `serverExternalPackages` (`next.config.ts:4`) stays set.

No column changes needed — `String @id @default(cuid())`, `DateTime`, `Int`, `Boolean` map cleanly. `file:` URLs must be replaced before deploying.

## 4. Seed Data

`prisma/seed.ts:204` — idempotent via `upsert`/`findUnique`:

- **Users:** `demo@geet.app / GeetDemo123!` (user + profile + preferences), `admin@geet.app / GeetAdmin123!` (`prisma/seed.ts:208`).
- **Genres:** 10 rows (`prisma/seed.ts:28`: Pop, Rock, Hip-Hop, R&B, Dance, Latin, Indie, Classic Rock, K-Pop, Queens of Pop).
- **Artists:** 42 from `ARTISTS_BIO` (`prisma/seed.ts:155`) with listeners/followers, normalized via `slugify`.
- **Tracks:** 80+ entries (`prisma/seed.ts:41`) — real YouTube IDs (`yid`), duration, genre, popularity, `TrackSource` with `thumbnailUrl`.
- **Albums:** 16 compilations/albums linking `yids` (`prisma/seed.ts:136`).
- **Featured:** 4 hero slots (`prisma/seed.ts:339`).
- **Playlists:** 3 for demo user + `PlaylistTrack` positions (`prisma/seed.ts:364`).
- **Activity:** follows, likes, `RecentlyPlayed` + `ListeningHistory` (`prisma/seed.ts:412`).

Run: `npm run db:seed` (`package.json:13`). Re-running is safe — existing `TrackSource` rows are skipped.

## 5. Useful Commands

| Task | Command |
|---|---|
| New migration | `npx prisma migrate dev --name <msg>` |
| Push without migration | `npm run db:push` |
| Visual editor | `npm run db:studio` |
| Reset + reseed | `npx prisma migrate reset` (drops, migrates, seeds) |
| Generate client | `npx prisma generate` |
