import { auth } from "@/auth";
import { db } from "@/lib/db";
import { artworkFallback } from "@/lib/utils";
import { ProfileEditor } from "./ProfileClient";
import { redirect } from "next/navigation";
import { Music2, Heart, History, ListMusic } from "lucide-react";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, playlistsCount, likedCount, historyCount] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    db.playlist.count({ where: { userId, deletedAt: null } }),
    db.likedTrack.count({ where: { userId } }),
    db.listeningHistory.count({ where: { userId } }),
  ]);
  if (!user) redirect("/login");

  const displayName = user.profile?.displayName ?? user.name ?? "—";
  const bio = user.profile?.bio ?? "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border glass p-6 flex gap-5 items-center">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-card">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center" style={{ background: artworkFallback(displayName) }}>
              <span className="text-xl font-bold text-white">{displayName.slice(0, 1).toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold">{displayName}</h1>
          <p className="text-sm text-muted">{user.email}</p>
          {bio && <p className="mt-1 text-sm text-muted line-clamp-2">{bio}</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <ListMusic className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 text-lg font-bold">{playlistsCount}</p>
          <p className="text-xs text-muted">Playlists</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <Heart className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 text-lg font-bold">{likedCount}</p>
          <p className="text-xs text-muted">Liked songs</p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4 text-center">
          <History className="mx-auto h-5 w-5 text-primary" />
          <p className="mt-1 text-lg font-bold">{historyCount}</p>
          <p className="text-xs text-muted">Plays</p>
        </div>
      </div>

      <ProfileEditor initialDisplayName={displayName} initialBio={bio} />
    </div>
  );
}
