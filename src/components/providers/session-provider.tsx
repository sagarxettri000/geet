"use client";

import { SessionProvider } from "next-auth/react";

export function SessionProviderClient({
  children,
  session,
}: {
  children: React.ReactNode;
  session: import("next-auth").Session | null;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}