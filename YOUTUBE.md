# YouTube Integration

GEET is **provider-agnostic**: the domain talks in `Track` + `TrackSource` (`prisma/schema.prisma:129`, `src/types/music.ts:3`); YouTube is an adapter that satisfies a `MusicSource` contract. Swapping in Spotify/SoundCloud means adding a second adapter — no core rewrite.

## 1. The Abstraction

```ts
// Domain (prisma/schema.prisma:157, src/types/music.ts:3)
TrackSource { provider: "youtube", providerVideoId: string, metadata?, thumbnailUrl? }
Track { sources: TrackSource[], thumbnailUrl, artistName, ... }

// Adapter contract (conceptual — each provider implements):
interface MusicSource {
  parseInput(input: string): string | null   // → canonical id
  fetchMetadata(id: string): Promise<{ title, author, thumbnail }>
  search?(query: string): Promise<Hit[]>      // optional, keyed
}
```

Today `provider` is always `"youtube"` (`src/services/catalog.ts:82`). `TrackSource @@unique([provider, providerVideoId])` (`prisma/schema.prisma:171`) prevents duplicates across providers.

## 2. Keyless Playback — IFrame Player API

No API key, no quota, ToS-compliant streaming.

**Component:** `src/components/player/YouTubePlayerHost.tsx:103`

- Loads `https://www.youtube.com/iframe_api` once (`loadYouTubeAPI` at `src/components/player/YouTubePlayerHost.tsx:73`).
- Creates `new YT.Player("geet-yt-host-player", { width:"0", height:"0", playerVars })` at `src/components/player/YouTubePlayerHost.tsx:126`.
- Container is hidden (`src/components/player/YouTubePlayerHost.tsx:352` — `width:0 height:0 visibility:hidden pointerEvents:none`); **custom controls** live in `src/components/player/PlayerBar.tsx` + `src/stores/player.ts:50`.
- `getVideoId(track)` (`src/components/player/YouTubePlayerHost.tsx:50`) resolves `sources[0].providerVideoId` → thumbnail fallback → bare 11-char id.
- Events: `onReady` (duration), `onStateChange` (playing/paused/ended→`next()`), `onError` at `src/components/player/YouTubePlayerHost.tsx:143`.
- Polling: 250ms `getCurrentTime`/`getDuration` → `setCurrentTime`/`setDuration` (`src/components/player/YouTubePlayerHost.tsx:320`).
- Sync: `isPlaying` → `playVideo`/`pauseVideo` (`src/components/player/YouTubePlayerHost.tsx:277`); `currentTrack` → `loadVideoById`/`cueVideoById` (`src/components/player/YouTubePlayerHost.tsx:260`); volume/muted → `setVolume`/`mute` (`src/components/player/YouTubePlayerHost.tsx:286`); seek if drift >0.75s (`src/components/player/YouTubePlayerHost.tsx:306`).

`playerVars`: `playsinline:1, controls:0, modestbranding:1, rel:0, iv_load_policy:3, disablekb:1, fs:0, enablejsapi:1, origin`.

## 3. Paste-a-Link — oEmbed (keyless)

**Endpoint:** `POST /api/youtube/intake` (`src/app/api/youtube/intake/route.ts:8`)

1. `parseYouTubeInput(input)` (`src/lib/youtube/video.ts:17`) — matches 11-char `YT_VIDEO_ID_RE` (`src/lib/youtube/video.ts:1`) or URL patterns: `watch?v=`, `watch/`, `embed/`, `shorts/`, `live/`, `youtu.be/`, `m.youtube.com/watch?v=` (`src/lib/youtube/video.ts:3`).
2. `fetchOEmbed(videoId)` (`src/lib/youtube/oembed.ts:26`) — `GET https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json` — returns `title`, `author_name`, `thumbnail_url` (`src/lib/youtube/oembed.ts:60`). Upgrades thumbnail to `hqdefault` (`src/lib/youtube/oembed.ts:76`). No key. Throws `OEmbedError` kinds: `not-found` (404), `network`, `server`, `invalid`.
3. `getOrCreateTrackFromVideo` (`src/services/catalog.ts:48`) — idempotent lookup by `TrackSource (provider=youtube, providerVideoId)`, else creates `Artist` (normalized) + `Track` + `TrackSource`.

Durations are unknown from oEmbed (set `null`); resolved later via player `getDuration`.

## 4. Optional Search — Data API v3

**Module:** `src/lib/youtube/data-api.ts:76` — gated on `process.env.YOUTUBE_API_KEY` (`src/lib/youtube/data-api.ts:62`).

- `searchYouTubeMusic(query, maxResults=20)` hits `youtube/v3/search` with `part=snippet, type=video, videoCategoryId=10 (Music)` + `videos.list` for `contentDetails.duration` (batched 50) (`src/lib/youtube/data-api.ts:113`).
- Validated by Zod (`searchResponseSchema` at `src/lib/youtube/data-api.ts:3`).
- `DataApiError` kinds: `no-key`, `quota` (403 `quotaExceeded`/`dailyLimitExceeded`), `rate-limit` (429), `network`, `invalid`, `server` (`src/lib/youtube/data-api.ts:46`).
- On `no-key`, callers degrade to local catalog search (`src/services/music.ts:136`). No exception leaks to UI.

`parseIsoDuration` (`src/lib/youtube/data-api.ts:176`) converts `PT1H2M3S`.

## 5. Thumbnails — Fallback Chain

`src/lib/youtube/thumbnails.ts:8` — ordered `maxresdefault → sddefault → hqdefault → mqdefault → default`.

- `thumbnailCandidates(videoId)` builds the chain; `youtubeThumbnail(id, size)` formats `https://i.ytimg.com/vi/${id}/${size}.jpg` (`src/lib/youtube/thumbnails.ts:16`).
- oEmbed returns `hqdefault` by default; `fetchOEmbed` normalizes to it, `bestThumbnail` (`src/lib/youtube/thumbnails.ts:28`) is the app default.
- `trackToDTO` (`src/services/music.ts:17`) fallback: `track.thumbnailUrl → source.thumbnailUrl → https://i.ytimg.com/vi/${providerVideoId}/hqdefault.jpg`.
- `next.config.ts:6` allow-lists `i.ytimg.com`/`img.youtube.com` for `next/image`.

## 6. Quota & Error Handling

| Layer | Strategy |
|---|---|
| No key | Intake + playback work; search falls back to DB |
| oEmbed 404 | `OEmbedError("not-found")` → intake returns `404` with message |
| Data API 403 quota | `DataApiError("quota")` → UI shows "quota exceeded, try later" |
| Data API 429 | `DataApiError("rate-limit")` → exponential backoff suggested |
| Network/timeout | 10s `AbortSignal.timeout` (`src/lib/youtube/data-api.ts:141`, `src/lib/youtube/oembed.ts:38`) → `network` error |
| Player error | `onError` → `setStatus("error")` (`src/components/player/YouTubePlayerHost.tsx:184`) |

Monitor `YOUTUBE_API_KEY` usage in Google Cloud Console → IAM & Quotas.

## 7. What GEET Does NOT Do

- **No downloading, no scraping, no `youtube-dl`.** Playback is exclusively via the official IFrame Player — compliant with YouTube ToS.
- **No background audio extraction.** The IFrame is the player; audio is YouTube-served.
- **No bypass of ads/age gates.** If YouTube blocks a video, the player surfaces the error; `oEmbed` returns 404/403 accordingly.
- **No storage of raw YouTube streams.** Only `providerVideoId` + metadata + thumbnail URL are persisted in `TrackSource`.

## 8. Adding a New Provider

1. Add `provider` value (e.g. `"spotify"`) to `TrackSource.provider`.
2. Implement `parseInput`, `fetchMetadata`, optional `search` under `src/lib/<provider>/`.
3. Map to `getOrCreateTrackFromVideo`-style upsert with `provider` discriminator.
4. Extend `getVideoId` → `getSourceId` in `YouTubePlayerHost` or introduce a `PlayerHost` per provider.
