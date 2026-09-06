import { cn } from "@/lib/utils";
import type { Track } from "@/types/music";
import { formatDuration, artworkFallback } from "@/lib/utils";
import { Play, Heart, MoreHorizontal, X } from "lucide-react";

export function TrackCard({
  track,
  onPlay,
  onLike,
  isLiked,
  onNotInterested,
}: {
  track: Track;
  onPlay?: () => void;
  onLike?: () => void;
  isLiked?: boolean;
  onNotInterested?: () => void;
}) {
  const thumb = track.thumbnailUrl;
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-surface p-3 hover:bg-surface-strong transition-colors">
      {onNotInterested && (
        <button
          onClick={onNotInterested}
          aria-label="Not interested"
          title="Not interested"
          className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="relative aspect-square overflow-hidden rounded-xl bg-card">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt={track.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="h-full w-full" style={{ background: artworkFallback(track.title) }} />
        )}
        <button
          onClick={onPlay}
          className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg group-hover:opacity-100 transition-opacity hover:scale-105"
          aria-label={`Play ${track.title}`}
        >
          <Play className="h-5 w-5 fill-current ml-0.5" />
        </button>
      </div>
      <div className="mt-3 space-y-1">
        <p className="truncate text-sm font-semibold leading-tight">{track.title}</p>
        <p className="truncate text-xs text-muted">{track.artist}</p>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>{formatDuration(track.durationSec)}</span>
        <div className="flex items-center gap-1">
          <button onClick={onLike} aria-label="Like" className={cn("p-1 rounded-full hover:bg-surface", isLiked && "text-primary")}>
            <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
          </button>
          <span className="p-1">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function ArtistCard({ artist, onFollow }: { artist: { id: string; name: string; imageUrl: string | null; verified?: boolean }; onFollow?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface p-4 text-center hover:bg-surface-strong transition-colors">
      <div className="h-24 w-24 overflow-hidden rounded-full bg-card">
        {artist.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artist.imageUrl} alt={artist.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full" style={{ background: artworkFallback(artist.name) }} />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold flex items-center gap-1 justify-center">
          {artist.name} {artist.verified && <span className="text-primary">✓</span>}
        </p>
        <p className="text-xs text-muted">Artist</p>
      </div>
      {onFollow && (
        <button onClick={onFollow} className="rounded-full border border-border px-4 py-1 text-xs font-medium hover:bg-card">
          Follow
        </button>
      )}
    </div>
  );
}