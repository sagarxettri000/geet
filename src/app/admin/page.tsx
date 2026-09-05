import { db } from "@/lib/db";
import { BanButton } from "./_components/BanButton";

export const dynamic = "force-dynamic";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

export default async function AdminPage() {
  const [usersCount, tracksCount, playlistsCount, reportsOpen, recentUsers, recentTracks] =
    await Promise.all([
      db.user.count(),
      db.track.count(),
      db.playlist.count(),
      db.report.count({ where: { status: "open" } }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, name: true, email: true, role: true, bannedAt: true, createdAt: true },
      }),
      db.track.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { id: true, title: true, artistName: true, popularity: true, createdAt: true },
      }),
    ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Admin dashboard</h1>
        <p className="mt-1 text-sm text-muted">Overview of GEET platform activity.</p>
      </div>

      <div id="overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Users" value={usersCount} />
        <StatCard label="Tracks" value={tracksCount} />
        <StatCard label="Playlists" value={playlistsCount} />
        <StatCard label="Reports open" value={reportsOpen} />
      </div>

      <section id="users" className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Recent users</h2>
          <span className="text-xs text-muted-2">{usersCount} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-background-elevated text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">User</th>
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Joined</th>
                <th className="px-4 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No users yet.
                  </td>
                </tr>
              ) : (
                recentUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-background-elevated/50">
                    <td className="px-4 py-3">
                      <div className="font-medium leading-none">{u.name ?? "—"}</div>
                      <div className="text-xs text-muted">{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === "admin" ? "bg-primary text-primary-foreground" : "bg-surface-elevated border border-border"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.bannedAt ? (
                        <span className="text-danger font-medium">Banned</span>
                      ) : (
                        <span className="text-success">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BanButton userId={u.id} banned={Boolean(u.bannedAt)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section id="tracks" className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent tracks</h2>
          </div>
          <ul className="divide-y divide-border">
            {recentTracks.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-muted">No tracks yet.</li>
            ) : (
              recentTracks.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="truncate text-xs text-muted">{t.artistName}</p>
                  </div>
                  <span className="ml-3 shrink-0 text-xs text-muted-2">pop {t.popularity}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section id="reports" className="rounded-xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Reports</h2>
          <p className="mt-2 text-sm text-muted">
            Open reports: <span className="font-bold text-foreground">{reportsOpen}</span>
          </p>
          <p className="mt-1 text-xs text-muted-2">Manage in Reports queue (coming soon).</p>
        </section>
      </div>

      <section id="playlists" className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Playlists</h2>
        <p className="mt-1 text-xs text-muted">Total playlists: {playlistsCount}</p>
      </section>

      <section id="featured" className="rounded-xl border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold">Featured</h2>
        <p className="mt-1 text-xs text-muted">Curate hero / trending sections (coming soon).</p>
      </section>
    </div>
  );
}
