"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic2, Library, ListMusic, Heart, Settings, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const NAV = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/podcast", label: "Podcasts", icon: Mic2 },
  { href: "/app/library", label: "Library", icon: Library },
  { href: "/app/playlists", label: "Playlists", icon: ListMusic },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link
        href="/app"
        onClick={(e) => {
          if (pathname === "/app") {
            e.preventDefault();
            window.dispatchEvent(new Event("geet:refresh-wall"));
          }
          onNavigate?.();
        }}
        className="group flex items-center gap-2.5 px-5 py-6"
        title="Refresh feed"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: "#8B5CF6" }}
          aria-hidden
        />
        <span className="font-display text-[22px] font-bold tracking-tight text-foreground">
          GEET
        </span>
        <RefreshCw
          className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        />
      </Link>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const exact = "exact" in item ? (item as { exact?: boolean }).exact : false;
          const active = isActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border px-3 py-4 space-y-1">
        <Link
          href="/app/library?filter=liked"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
            pathname.includes("liked") || pathname === "/app/library"
              ? "text-foreground"
              : "text-muted hover:bg-surface hover:text-foreground",
            // keep subtle active for liked filter
            pathname.includes("filter=liked") && "bg-surface text-foreground"
          )}
        >
          <Heart className="h-[18px] w-[18px] shrink-0" />
          Liked Songs
        </Link>

        <Link
          href="/app/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
            isActive(pathname, "/app/settings")
              ? "bg-surface text-foreground"
              : "text-muted hover:bg-surface hover:text-foreground"
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          Settings
        </Link>

        {/* User */}
        <Link
          href="/app/profile"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 transition-colors hover:bg-surface-elevated"
        >
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User"}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {(user?.name ?? user?.email ?? "U").slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-foreground">
              {user?.name ?? user?.email ?? "Guest"}
            </span>
            <span className="block truncate text-xs text-muted">View profile</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

export function Sidebar({
  open,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-background lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <button
            aria-label="Close sidebar"
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />
          <div className="relative flex w-64 flex-col bg-background shadow-float">
            <SidebarContent onNavigate={onClose} />
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
