import { Mic2, Search } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Podcasts · GEET",
};

export default function PodcastPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Podcasts</h1>
        <p className="text-sm text-muted">Find shows worth your ears.</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface/50 px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
          <Mic2 className="h-8 w-8 text-muted" />
        </span>
        <h2 className="mt-5 text-lg font-semibold">Podcasts are coming soon</h2>
        <p className="mt-1 max-w-md text-sm text-muted">
          Stay tuned — podcast streaming is on its way. In the meantime, search all of
          GEET&apos;s music from the bar up top.
        </p>
        <Link
          href="/app/search"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Search className="h-4 w-4" />
          Explore music
        </Link>
      </div>
    </div>
  );
}
