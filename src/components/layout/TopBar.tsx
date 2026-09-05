"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User, ChevronDown, Search, X } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

function SearchBar() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const q = value.trim();
    if (!q) {
      // focus again so the user can type
      inputRef.current?.focus();
      return;
    }
    router.push(`/app/search?q=${encodeURIComponent(q)}`);
  };

  const clear = () => {
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onClick={() => inputRef.current?.focus()}
      className={cn(
        "group relative flex w-full items-center rounded-[14px] border bg-[rgba(60,59,64,0.85)] backdrop-blur transition-all duration-200",
        "border-[rgba(255,255,255,0.20)] shadow-[0_8px_24px_rgba(0,0,0,0.35)]",
        focused &&
          "border-[rgba(255,255,255,0.38)] shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(99,102,241,0.18),0_0_24px_rgba(99,102,241,0.16)]"
      )}
    >
      {/* magnifying-glass icon */}
      <span className="pointer-events-none absolute left-[30px] flex items-center pl-0">
        <Search className="h-[26px] w-[26px] text-[#A6A7AC]" strokeWidth={2.5} aria-hidden />
      </span>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Search songs, albums, artists, podcasts"
        className="w-full bg-transparent py-4 pl-[74px] pr-11 font-sans text-base text-foreground placeholder:text-[#A8A9AD] placeholder:font-normal outline-none sm:text-lg md:text-[22px]"
        aria-label="Search"
      />

      {/* clear button — only when there is text */}
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-[30px] flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(255,255,255,0.10)] text-[#A6A7AC] transition-colors hover:bg-[rgba(255,255,255,0.18)] hover:text-white"
        >
          <X className="h-4 w-4" strokeWidth={2.5} />
        </button>
      )}
    </form>
  );
}

export function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { data: session } = useSession();

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

  const user = session?.user;

  return (
    <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/80 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:px-6">
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-surface lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Search bar — centered, near the top, up to ~820px wide */}
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-[820px]">
          <SearchBar />
        </div>
      </div>

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
