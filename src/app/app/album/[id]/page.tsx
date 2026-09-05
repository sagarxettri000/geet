import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trackToDTO, albumToDTO } from "@/services/music";
import { formatDuration, artworkFallback } from "@/lib/utils";
import { AlbumTrackList, PlayAllBtn } from "./AlbumClient";

export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const album = await db.album.findUnique({
    where: { id },
    include: { artist: true, tracks: { include: { track: { include: { sources: true, ...(userId ? { likedBy: { where: { userId } } } : {}) } as any } }, orderBy: { position: "asc" } } },
  });
  if (!album) return notFound();

  const trackRows = album.tracks.map((at) => at.track);
  const likedSet = new Set<string>((trackRows as any[]).filter((t) => t.likedBy?.length).map((t) => t.id));
  const tracks = trackRows.map((t) => trackToDTO(t as any, { liked: likedSet.has(t.id) }));

  const totalSec = tracks.reduce((s, t) => s + (t.durationSec ?? 0), 0);
  const dto = albumToDTO({ ...album, _count: { tracks: tracks.length } } as any);

  let playlists: { id: string; name: string }[] = [];
  if (userId) {
    playlists = await db.playlist.findMany({ where: { userId, deletedAt: null }, select: { id: true, name: true }, take: 20, orderBy: { updatedAt: "desc" } });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 rounded-2xl border border-border glass p-5 md:flex-row">
        <div className="h-44 w-44 shrink-0 overflow-hidden rounded-xl bg-card shadow-card md:h-52 md:w-52">
          {album.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={album.coverUrl} alt={album.title} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: artworkFallback(album.title) }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{album.type}</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight">{album.title}</h1>
          <a href={`/app/artist/${album.artistId}`} className="mt-1 inline-block text-sm font-medium hover:underline">
            {album.artistName}
          </a>
          <p className="mt-1 text-xs text-muted">
            {album.year} · {tracks.length} songs · {formatDuration(totalSec || null)}
          </p>
          <div className="mt-4">
            <PlayAllBtn tracks={tracks} />
          </div>
        </div>
      </div>

      <AlbumTrackList tracks={tracks} likedSet={likedSet} playlists={playlists} />
    </div>
  );
}
