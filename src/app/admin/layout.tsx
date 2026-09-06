import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-helpers";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin#users", label: "Users" },
  { href: "/admin#tracks", label: "Tracks" },
  { href: "/admin#playlists", label: "Playlists" },
  { href: "/admin#reports", label: "Reports" },
  { href: "/admin#featured", label: "Featured" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/app");
  }

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-background-elevated md:flex md:flex-col">
        <div className="border-b border-border px-5 py-4">
          <Link href="/admin" className="font-display text-lg font-bold tracking-tight">
            <span className="text-primary">GEET</span> Admin
          </Link>
          <p className="mt-1 text-xs text-muted">Control center</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Link
            href="/app"
            className="flex items-center justify-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface"
          >
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-background-elevated px-4 py-3 md:hidden">
          <Link href="/admin" className="font-display text-base font-bold">
            <span className="text-primary">GEET</span> Admin
          </Link>
          <nav className="ml-auto flex gap-1 overflow-x-auto">
            {nav.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-muted hover:bg-surface hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main id="main-content" className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
