import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { trackToDTO, albumToDTO, artistToDTO } from "@/services/music";
import { formatListeners, artworkFallback } from "@/lib/utils";
import { BadgeCheck } from "lucide-react";
import { ArtistActions, TrackList } from "./ArtistClient";

export default async function ArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id as string | undefined;

  const artist = await db.artist.findUnique({ where: { id } });
  if (!artist) return notFound();

  const [followed, topTracksRaw, albumsRaw] = await Promise.all([
    userId ? db.followedArtist.findUnique({ where: { userId_artistId: { userId, artistId: id } } }) : null,
    db.track.findMany({
      where: { artistId: id },
      include: { sources: true, ...(userId ? { likedBy: { where: { userId } } } : {}) } as any,
      orderBy: { popularity: "desc" },
      take: 10,
    }),
    db.album.findMany({ where: { artistId: id }, include: { _count: { select: { tracks: true } } }, orderBy: { year: "desc" } }),
  ]);

  const likedIds = new Set<string>(
    (topTracksRaw as any[]).filter((t) => t.likedBy?.length).map((t) => t.id)
  );
  const tracks = topTracksRaw.map((t) => trackToDTO(t as any, { liked: likedIds.has(t.id) }));
  const albums = albumsRaw.map((a) => albumToDTO(a));
  const isFollowing = !!followed;

  let playlists: { id: string; name: string }[] = [];
  if (userId) {
    const pls = await db.playlist.findMany({ where: { userId, deletedAt: null }, select: { id: true, name: true }, orderBy: { updatedAt: "desc" }, take: 20 });
    playlists = pls;
  }

  return (
    <div className="space-y-6">
      {/* sticky header */}
      <div className="sticky top-0 z-10 -mx-4 -mt-6 border-b border-border glass-strong px-4 py-5 lg:-mx-6">
        <div className="flex gap-4 items-center max-w-[1280px] mx-auto">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-card shadow-card md:h-28 md:w-28">
            {artist.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={artist.imageUrl} alt={artist.name} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full" style={{ background: artworkFallback(artist.name) }} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-xl font-bold md:text-2xl">{artist.name}</h1>
              {artist.verified && <BadgeCheck className="h-5 w-5 shrink-0 text-primary fill-primary/20" />}
            </div>
            {artist.bio && <p className="mt-1 line-clamp-2 text-xs text-muted md:text-sm">{artist.bio}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>{formatListeners(artist.followers)} followers</span>
              <span>·</span>
              <span>{formatListeners(artist.monthlyListeners)} monthly listeners</span>
            </div>
            <div className="mt-3">
              <ArtistActions artistId={artist.id} initialFollowing={isFollowing} tracks={tracks} />
            </div>
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-base font-semibold mb-3">Top tracks</h2>
        <TrackList tracks={tracks} likedSet={likedIds} playlists={playlists} />
      </section>

      {albums.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3">Albums</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {albums.map((al) => (
              <a key={al.id} href={`/app/album/${al.id}`} className="rounded-2xl border border-border bg-surface p-3 hover:bg-surface-elevated transition-colors block">
                <div className="aspect-square overflow-hidden rounded-xl bg-card">
                  {al.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={al.coverUrl} alt={al.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full" style={{ background: artworkFallback(al.title) }} />
                  )}
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{al.title}</p>
                <p className="truncate text-xs text-muted">{al.year} · {al.type}</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
