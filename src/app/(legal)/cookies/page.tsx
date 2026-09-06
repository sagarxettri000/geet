import type { Metadata } from "next";
import { LegalArticle } from "../_components/LegalArticle";
import { CookieSettings } from "@/components/legal/CookieSettings";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalArticle title="Cookie Policy" lastUpdated="September 6, 2026">
      <section>
        <h2>Intro</h2>
        <p>
          GEET keeps cookies and browser storage to a minimum. We do not show advertising,
          we do not use ad-tech cookies, and we do not run third-party analytics. This page
          lists everything the Service stores, why it stores it, and how you can change your
          choice at any time.
        </p>
        <p>
          First visit: the banner at the bottom of the page records your choice in your own
          browser. You can change or withdraw it here at any time.
        </p>
      </section>

      <section>
        <h2>Cookies we place</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Lifespan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">authjs.session-token</td>
                <td className="py-3 pr-4">Cookie (HTTP-only, SameSite)</td>
                <td className="py-3 pr-4">Keeps you signed in. Contains a signed session token, not accessible to JavaScript.</td>
                <td className="py-3">Session; expires with your session. Cleared on logout.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">authjs.csrf-token and related callback cookies</td>
                <td className="py-3 pr-4">Cookie (HTTP-only, SameSite)</td>
                <td className="py-3 pr-4">Protects the sign-in flow against cross-site request forgery.</td>
                <td className="py-3">Session.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">geet:cookie-consent</td>
                <td className="py-3 pr-4">Browser local storage</td>
                <td className="py-3 pr-4">Remembers the cookie choice you made (this page and the banner).</td>
                <td className="py-3">Until you clear the item or withdraw consent.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Website (non-identifying) storage</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Purpose</th>
                <th className="py-2">Lifespan</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">geet:recent-searches</td>
                <td className="py-3 pr-4">Browser local storage</td>
                <td className="py-3 pr-4">Your last few search queries so the search box can show them the next time. Stays on your device only.</td>
                <td className="py-3">Removed by the &ldquo;Clear&rdquo; button; capped at 8 entries.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">geet:podcast-query</td>
                <td className="py-3 pr-4">Browser local storage</td>
                <td className="py-3 pr-4">Remembers the podcast search term you last used on this device.</td>
                <td className="py-3">Until you clear it.</td>
              </tr>
              <tr className="border-b border-border/60">
                <td className="py-3 pr-4 font-mono text-xs">geet:session-id</td>
                <td className="py-3 pr-4">Session storage</td>
                <td className="py-3 pr-4">A random, anonymous identifier for this browsing session used to keep recommendation context consistent. Cleared automatically when the tab closes.</td>
                <td className="py-3">While the tab is open.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          A note on server-side session IDs: search sessions on the app are also tracked by
          a token stored in the session record we keep. None of these items identify you to
          third parties, and none are used for advertising.
        </p>
      </section>

      <section>
        <h2>Embedded YouTube content</h2>
        <p>
          GEET plays music through YouTube&apos;s official embedded player. The YouTube script
          and player load <strong>only when you press play</strong> (or when you open a
          track that needs YouTube artwork, artwork loads as images from YouTube&#39;s CDN). To
          learn what YouTube/Google does with your data, see{" "}
          <a
            href="https://policies.google.com/privacy"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Google&apos;s Privacy Policy
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Your choice</h2>
        <p>
          The Service only ever sets strictly necessary cookies, so there is nothing
          optional to opt out of today. The controls below are shown for transparency and
          for any future non-essential features:
        </p>
        <div className="mt-1"><CookieSettings /></div>
      </section>
    </LegalArticle>
  );
}