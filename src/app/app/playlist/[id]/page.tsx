import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trackToDTO, playlistToDTO } from "@/services/music";
import { artworkFallback, formatDuration } from "@/lib/utils";
import { Globe, Lock, Music2 } from "lucide-react";
import { PlaylistControls, PlaylistTracks } from "./PlaylistClient";

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const playlist = await db.playlist.findFirst({
    where: { id, deletedAt: null },
    include: {
      _count: { select: { tracks: true } },
      user: { select: { name: true, image: true } },
      tracks: { include: { track: { include: { sources: true } } }, orderBy: { position: "asc" } },
    },
  });
  if (!playlist) return notFound();
  if (!playlist.isPublic && playlist.userId !== userId) return notFound();

  const dto = playlistToDTO(playlist as any);
  const trackEntries = playlist.tracks.map((pt) => ({
    trackId: pt.trackId,
    track: trackToDTO(pt.track as any),
  }));
  const totalSec = trackEntries.reduce((s, e) => s + (e.track.durationSec ?? 0), 0);
  const isOwner = userId === playlist.userId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-border glass p-5 md:flex-row">
        <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-card shadow-card flex items-center justify-center md:h-52 md:w-52">
          {playlist.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={playlist.coverUrl} alt={playlist.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: artworkFallback(playlist.name) }}>
              <Music2 className="h-10 w-10 text-white/80" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 text-xs">
            {playlist.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />} {playlist.isPublic ? "Public" : "Private"}
          </p>
          <h1 className="mt-2 text-2xl font-bold leading-tight">{playlist.name}</h1>
          {playlist.description && <p className="mt-1 text-sm text-muted line-clamp-2">{playlist.description}</p>}
          <p className="mt-2 text-xs text-muted">
            By {dto.ownerName} · {trackEntries.length} songs · {formatDuration(totalSec || null)}
          </p>
          <div className="mt-4">
            <PlaylistControls playlistId={playlist.id} tracks={trackEntries.map((e) => e.track)} isOwner={isOwner} initialName={playlist.name} initialDesc={playlist.description} initialPublic={playlist.isPublic} />
          </div>
        </div>
      </div>

      <PlaylistTracks playlistId={playlist.id} initialTracks={trackEntries} isOwner={isOwner} />
    </div>
  );
}
