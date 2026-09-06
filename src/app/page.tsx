import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Music2, Search, Library, Play, Sparkles } from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Search everything",
    desc: "Type any song, artist, or genre — GEET finds YouTube results and plays them in a custom player.",
  },
  {
    icon: Play,
    title: "Custom player",
    desc: "A precise player with queue, shuffle, repeat and keyboard controls.",
  },
  {
    icon: Library,
    title: "Playlists",
    desc: "Create, reorder, and share playlists. Your library, your rules — private or public.",
  },
  {
    icon: Sparkles,
    title: "Tuned for you",
    desc: "A home feed, mixes, and genre suggestions that learn from what you listen to.",
  },
] as const;

function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 font-display font-bold tracking-tight">
      <span
        className="grid place-items-center rounded-xl text-primary-foreground"
        style={{
          width: size + 8,
          height: size + 8,
          background: "#8B5CF6",
          boxShadow: "0 4px 20px rgb(139 92 246 / 0.4)",
        }}
      >
        <Music2 size={size * 0.62} className="text-white" />
      </span>
      <span className="text-[22px] tracking-[-0.02em]">GEET</span>
    </span>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-auto">
      {/* ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[640px] w-[960px] -translate-x-1/2 rounded-full opacity-[0.12] blur-[80px]" style={{ background: "radial-gradient(ellipse at center, #8B5CF6 0%, transparent 65%)" }} />
        <div className="absolute top-64 -right-48 h-[520px] w-[520px] rounded-full opacity-[0.07] blur-[80px]" style={{ background: "radial-gradient(ellipse at center, #ff6b6b 0%, transparent 65%)" }} />
        <div className="absolute bottom-0 left-0 h-[480px] w-[680px] rounded-full opacity-[0.05] blur-[90px]" style={{ background: "radial-gradient(ellipse at center, #818cf8 0%, transparent 65%)" }} />
      </div>

      {/* header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/60 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
        <div className="mx-auto flex h-[64px] w-full max-w-[1120px] items-center justify-between px-6">
          <Link href="/" aria-label="GEET home">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link href="#features" className="rounded-full px-4 py-2 text-sm text-muted hover:bg-surface hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="/login" className="rounded-full px-4 py-2 text-sm text-muted hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/app" className="ml-2">
              <Button size="sm">Open app</Button>
            </Link>
          </nav>
          <Link href="/app" className="sm:hidden">
            <Button size="sm">Open app</Button>
          </Link>
        </div>
      </header>

      {/* hero */}
      <main id="main-content" className="flex-1">
        <section className="mx-auto max-w-[1120px] px-6 pt-16 pb-10 sm:pt-24 sm:pb-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">
                <Sparkles size={12} />
              </span>
              Free music streaming — powered by YouTube
            </div>

            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-[56px] lg:leading-[1.05]">
              Where great music
              <br />
              <span className="bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] bg-clip-text text-transparent">finds you</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-pretty text-[17px] leading-7 text-muted">
              Search any song, build playlists, and play in a custom player. Free, private, and
              powered by official YouTube playback.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/app" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto shadow-[0_8px_24px_rgb(139_92_246/0.25)]">
                  Start listening — free
                </Button>
              </Link>
              <Link href="/login" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full">
                  Sign in
                </Button>
              </Link>
            </div>

            <p className="mt-3 text-xs text-muted-2">No credit card. Just music.</p>

            {/* hero preview — glassmorphic */}
            <div className="relative mx-auto mt-12 max-w-2xl sm:mt-14">
              <div className="glass rounded-[24px] p-3 shadow-card sm:p-4">
                <div className="flex items-center gap-3 rounded-2xl bg-surface-elevated px-3 py-3 sm:px-4">
                  <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#6D28D9] grid place-items-center text-primary-foreground shadow">
                    <Play size={18} className="ml-0.5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">Your song</span>
                      <span className="hidden rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary sm:inline">Sample player</span>
                    </div>
                    <span className="truncate text-xs text-muted">Artist name · 3:42</span>
                  </div>
                  <div className="hidden h-1.5 w-24 rounded-full bg-border sm:block">
                    <div className="h-full w-[62%] rounded-full bg-primary" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-left">
                  {[
                    ["Free", "no subscription"],
                    ["Personal", "your own feed"],
                    ["Private", "no ad tracking"],
                  ].map(([v, k]) => (
                    <div key={k} className="rounded-2xl bg-surface px-3 py-3 sm:px-4">
                      <div className="text-sm font-bold tracking-tight">{v}</div>
                      <div className="text-[11px] text-muted">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div aria-hidden className="pointer-events-none absolute -inset-3 -z-10 rounded-[28px] opacity-30 blur-2xl" style={{ background: "linear-gradient(135deg, rgb(255 180 84 / 0.22), rgb(255 107 107 / 0.12))" }} />
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-[1120px] px-6 pb-16 sm:pb-24">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="glass group rounded-2xl p-5 transition-all hover:shadow-card-hover hover:border-border-strong sm:p-6"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-surface text-primary">
                  <f.icon size={18} />
                </span>
                <h3 className="mt-4 text-sm font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* secondary CTA */}
          <div className="glass mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl p-6 sm:flex-row sm:p-8">
            <div>
              <h3 className="font-display text-lg font-semibold">Ready to hear it?</h3>
              <p className="mt-1 text-sm text-muted">Pick a song and hit play. Free and private.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/app">
                <Button>Go to app</Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline">Create account</Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-2 sm:flex-row">
          <span className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Music2 size={12} />
            </span>
            © {new Date().getFullYear()} GEET — Where great music finds you.
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/login" className="hover:text-muted">Sign in</Link>
            <Link href="/signup" className="hover:text-muted">Sign up</Link>
            <Link href="/app" className="hover:text-muted">App</Link>
            <Link href="/privacy" className="hover:text-muted">Privacy</Link>
            <Link href="/terms" className="hover:text-muted">Terms</Link>
            <Link href="/cookies" className="hover:text-muted">Cookies</Link>
            <Link href="/refunds" className="hover:text-muted">Refunds</Link>
            <Link href="/contact" className="hover:text-muted">Contact</Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
