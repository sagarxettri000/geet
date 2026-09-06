import Link from "next/link";

const LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/cookies", label: "Cookies" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
] as const;

export function LegalFooter() {
  return (
    <footer className="border-t border-border bg-background/95">
      <div className="mx-auto max-w-[1120px] px-4 py-5 lg:px-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-muted">&copy; GEET. All rights reserved.</p>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-4 gap-y-2">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-muted hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default LegalFooter;