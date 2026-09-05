"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Library, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/search", label: "Search", icon: Search },
  { href: "/app/library", label: "Library", icon: Library },
  { href: "/app/playlists", label: "Playlists", icon: ListMusic },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-background/95 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur supports-[backdrop-filter]:bg-background/95 lg:hidden"
    >
      {TABS.map((item) => {
        const { href, label, icon: Icon } = item;
        const exact = "exact" in item ? (item as { exact?: boolean }).exact : false;
        const active = isActive(pathname, href, exact);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className={cn("h-5 w-5", active && "fill-current")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileNav;
