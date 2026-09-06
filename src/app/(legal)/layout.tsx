import Link from "next/link";
import type { Metadata } from "next";
import { Music2 } from "lucide-react";
import { LegalFooter } from "@/components/legal/LegalFooter";

export const metadata: Metadata = {
  title: {
    default: "Legal",
    template: "%s — GEET",
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full opacity-[0.10] blur-[80px]"
          style={{ background: "radial-gradient(ellipse at center, #8B5CF6 0%, transparent 65%)" }}
        />
      </div>
      <header className="mx-auto flex w-full max-w-[880px] items-center justify-between px-4 py-6 lg:px-6">
        <Link href="/" className="inline-flex items-center gap-2 font-display text-xl font-bold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_20px_rgb(139_92_246/0.35)]">
            <Music2 size={15} className="text-primary-foreground" />
          </span>
          GEET
        </Link>
        <Link href="/app" className="text-sm text-muted hover:text-foreground">
          Open app
        </Link>
      </header>
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-16 lg:px-6">{children}</main>
      <LegalFooter />
    </div>
  );
}