"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, Link2, LogOut, User, ChevronDown } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useToast } from "@/components/ui/toast";
import { usePlayerStore } from "@/stores/player";
import { cn } from "@/lib/utils";

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/app/search?q=${encodeURIComponent(q)}`);
  };

  const handleYouTubeIntake = async () => {
    const url = ytUrl.trim();
    if (!url) return;
    setYtLoading(true);
    try {
      const res = await fetch("/api/youtube/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to import");
      const track = data.track;
      if (track) {
        usePlayerStore.getState().playTrack(track);
        toast(`Playing: ${track.title} — ${track.artist}`);
      } else {
        toast(data.message ?? "Added to library");
      }
      setYtUrl("");
      router.refresh();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Failed to import YouTube link");
    } finally {
      setYtLoading(false);
    }
  };

  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search */}
      <form
        onSubmit={handleSearch}
        className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-[360px]"
        role="search"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, playlists"
            className="h-9 w-full rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="hidden h-9 shrink-0 rounded-full bg-surface px-4 text-sm font-medium hover:bg-surface-elevated lg:inline-flex lg:items-center"
        >
          Search
        </button>
      </form>

      {/* YouTube intake */}
      <div className="hidden items-center gap-2 md:flex">
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={ytUrl}
            onChange={(e) => setYtUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleYouTubeIntake();
            }}
            placeholder="Paste YouTube link"
            className="h-9 w-64 rounded-full border border-border bg-surface py-2 pl-10 pr-4 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:w-72"
          />
        </div>
        <button
          onClick={handleYouTubeIntake}
          disabled={ytLoading || !ytUrl.trim()}
          className={cn(
            "inline-flex h-9 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          )}
        >
          {ytLoading ? "Adding…" : "Add"}
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1 md:hidden" />

      {/* User menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 transition-colors hover:bg-surface-elevated"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "User"} className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {(user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[120px] truncate text-sm font-medium lg:block">
            {user?.name ?? user?.email ?? "Account"}
          </span>
          <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", menuOpen && "rotate-180")} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-background-elevated p-1.5 shadow-float">
            {user && (
              <div className="flex items-center gap-3 px-3 py-2.5">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{user.name ?? "User"}</span>
                  <span className="block truncate text-xs text-muted">{user.email}</span>
                </span>
              </div>
            )}
            <div className="my-1 border-t border-border" />
            <Link
              href="/app/profile"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-surface"
            >
              <User className="h-4 w-4 text-muted" />
              Profile
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
            >
              <LogOut className="h-4 w-4 text-muted" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
