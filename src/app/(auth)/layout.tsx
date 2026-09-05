import Link from "next/link";
import { Music2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-auto bg-background text-foreground flex flex-col">
      {/* ambient */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-32 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full opacity-[0.10] blur-[80px]"
          style={{ background: "radial-gradient(ellipse at center, #8B5CF6 0%, transparent 65%)" }}
        />
      </div>

      <header className="mx-auto flex w-full max-w-[1120px] items-center justify-center px-6 py-8 sm:py-10">
        <Link href="/" className="inline-flex items-center gap-2.5 font-display text-[22px] font-bold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_4px_20px_rgb(139_92_246/0.35)]">
            <Music2 size={16} className="text-primary-foreground" />
          </span>
          GEET
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center">
        <div className="w-full max-w-[420px] glass rounded-2xl p-6 shadow-float sm:p-8">{children}</div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-2">
        <Link href="/" className="hover:text-muted underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </footer>
    </div>
  );
}
