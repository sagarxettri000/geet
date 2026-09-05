"use client";

import { SessionProviderClient } from "@/components/providers/session-provider";

export function AppProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session: import("next-auth").Session | null;
}) {
  return (
    <SessionProviderClient session={session}>
      {children}
    </SessionProviderClient>
  );
}