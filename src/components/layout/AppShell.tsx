"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { PlayerBar } from "@/components/player/PlayerBar";
import YouTubePlayerHost from "@/components/player/YouTubePlayerHost";
import { QueueDrawer } from "@/components/player/QueueDrawer";
import { ToastProvider } from "@/components/ui/toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // theme is controlled via UserPreference / Settings; default to dark only if unset
  useEffect(() => {
    const cur = document.documentElement.getAttribute("data-theme");
    if (!cur) document.documentElement.setAttribute("data-theme", "dark");
    // sync from server preference if available
    fetch("/api/preferences").then((r) => r.json()).then((j) => {
      if (j?.preference?.theme) document.documentElement.setAttribute("data-theme", j.preference.theme);
    }).catch(() => {});
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

      {/* Global player + YouTube iframe */}
      <PlayerBar />
      <YouTubePlayerHost />
      {/* Included for spec completeness; PlayerBar manages its own QueueDrawer internally */}
      <QueueDrawer open={false} onClose={() => {}} />
    </ToastProvider>
  );
}

export default AppShell;
