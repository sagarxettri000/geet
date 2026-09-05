"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { PlayerBar } from "@/components/player/PlayerBar";
import YouTubePlayerHost from "@/components/player/YouTubePlayerHost";
import { usePlayerStore } from "@/stores/player";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // theme + saved playback preferences
  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    if (!cur) document.documentElement.setAttribute("data-theme", "dark");
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((j) => {
        const p = j?.preference;
        if (!p) return;
        if (p.theme) document.documentElement.setAttribute("data-theme", p.theme);
        const store = usePlayerStore.getState();
        if (p.volume != null) store.setVolume(p.volume);
        if (p.muted != null) store.setMuted(p.muted);
        if (p.repeatMode) store.setRepeat(p.repeatMode);
        if (p.shuffle != null) store.setShuffle(p.shuffle);
      })
      .catch(() => {});
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar onMenuClick={() => setSidebarOpen(true)} />

          {/* scrollable content */}
          <main className="flex-1 overflow-y-auto pb-28 lg:pb-24">
            <div className="mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-6">
              {children}
            </div>
          </main>

          <MobileNav />
        </div>
      </div>

      <PlayerBar />
      <YouTubePlayerHost />
    </ToastProvider>
  );
}

export default AppShell;
