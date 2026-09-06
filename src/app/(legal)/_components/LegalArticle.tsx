import type { ReactNode } from "react";

export function LegalArticle({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <article className="glass rounded-2xl border border-border p-6 shadow-card sm:p-10">
      <header className="border-b border-border pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 text-xs text-muted">
          Version 1.0 &middot; Last updated {lastUpdated}
        </p>
      </header>
      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
        {children}
      </div>
    </article>
  );
}