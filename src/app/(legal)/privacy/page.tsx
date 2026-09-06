import type { Metadata } from "next";
import { LegalArticle } from "../_components/LegalArticle";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalArticle title="Privacy Policy" lastUpdated="September 6, 2026">
      <section>
        <h2>Who we are</h2>
        <p>
          GEET is a free music-listening service (the &lsquo;Service&rsquo;). The operator
          is{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: legal entity name, registered address]
          </span>
          . You can reach us through the channels on our{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact page
          </a>
          .
        </p>
      </section>

      <section>
        <h2>What this policy covers</h2>
        <p>
          This policy explains what personal information we collect, why we collect it, how
          we use it, how long we keep it, and the choices you have. It applies to
          geet-rouge.vercel.app (plus any domain we later list here) and the GEET
          application.
        </p>
        <p>
          We are a first-party, video-embedding service. We do not run advertising
          networks, do not sell personal information, and do not use third-party analytics
          (such as Google Analytics or Meta Pixel).
        </p>
      </section>

      <section>
        <h2>Information we collect</h2>
        <p className="font-semibold">Account information (only if you create an account):</p>
        <ul>
          <li>Email address (required to sign up or sign in).</li>
          <li>A display name (optional).</li>
          <li>A password you choose (optional if you sign in with Google), stored only as a
            bcrypt hash — we can never read it back.</li>
          <li>Your basic Google account profile picture and email if you sign in with
            Google. You are never required to connect a Google account.</li>
        </ul>
        <p className="mt-3 font-semibold">Activity information (only for signed-in use):</p>
        <ul>
          <li>Music you play, pause, skip, like, and search for, plus feedback you give
            (hiding a song, marking one as not interested). This powers your personal
            recommendation feed.</li>
          <li>Lists you build (playlists) and favorites you create.</li>
        </ul>
        <p className="mt-3 font-semibold">Device/technical information:</p>
        <ul>
          <li>A session cookie that keeps you signed in, and the regional setting your
            browser reports when you use regional YouTube charts (no regional broadcast of
            your identity is made).</li>
          <li>Basic request metadata (IP address, user agent, timestamps) in standard
            server logs used for security and operational troubleshooting.{" "}
            <span className="text-[#8B5CF6]">
              [OWNER CONFIRMATION REQUIRED: retention period for server logs]
            </span>
          </li>
        </ul>
      </section>

      <section>
        <h2>How we use information</h2>
        <ul>
          <li>To operate the Service: sign you in, play music, save your playlists, and show
            you content you asked for.</li>
          <li>To build your personal recommendations from your own listening activity.
            Recommendations are computed per-account and are not shared between users.</li>
          <li>To keep the Service secure and investigate abuse.</li>
          <li>To respond to your requests (account, privacy, or support).</li>
          <li>We do not build profiles of you for advertising, and we do not sell or rent your
            information to anyone.</li>
        </ul>
      </section>

      <section>
        <h2>Legal bases for processing</h2>
        <p>
          Where applicable privacy law requires one, our legal bases are: (a) the
          performance of the contract you enter when you use the Service; (b) our
          legitimate interest in operating and securing the Service; and (c) your consent
          where we ask for it (for example, cookie choices and any optional data you give
          us).
        </p>
      </section>

      <section>
        <h2>Cookies and local storage</h2>
        <p>
          A session cookie (HTTP-only, SameSite) is strictly necessary to keep you signed in.
          We also use small amounts of browser local storage and a session-storage token to
          remember trivial non-identifying preferences. Full details — including what each
          item stores, where it lives, and how long it lasts — are in our{" "}
          <a href="/cookies" className="underline underline-offset-2 hover:text-foreground">
            Cookie Policy
          </a>
          . There are no advertising or analytics cookies.
        </p>
      </section>

      <section>
        <h2>Third parties we rely on</h2>
        <ul>
          <li>
            <strong>YouTube (Google):</strong> When you play a track or look at artwork or
            song details that came from YouTube, GEET may load YouTube&#39;s embedded player and
            thumbnail images. The player only loads when you press play. Google&#39;s use of
            your data is governed by{" "}
            <a
              href="https://policies.google.com/privacy"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Google&#39;s Privacy Policy
            </a>{" "}
            and the{" "}
            <a
              href="https://www.youtube.com/t/terms"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              YouTube Terms of Service
            </a>
            . We do not control, and are not responsible for, the privacy practices of
            YouTube or Google.
          </li>
          <li>
            <strong>Search (YouTube Data API):</strong> searches you run in the Service are
            sent from our servers to the YouTube Data API using a scoped API key. We do not
            pass your account identity to YouTube for this purpose.
          </li>
          <li>
            <strong>Google sign-in (optional):</strong> if you choose to sign in with
            Google, your browser may contact accounts.google.com. This is initiated only by
            your own action.
          </li>
          <li>
            <strong>Infrastructure:</strong> the Service and its database are hosted by
            third-party cloud providers.{" "}
            <span className="text-[#8B5CF6]">
              [OWNER CONFIRMATION REQUIRED: name the hosting providers and data regions you
              use]
            </span>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2>How long we keep data</h2>
        <p>
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: specify precise retention periods — for example:
            account data retained until you request deletion; activity signals retained for
            N months; server logs retained for N days. Until you confirm, data is kept for
            as long as it takes to operate the Service, and you can ask us to delete it at
            any time.]
          </span>
        </p>
        <p>
          You can delete or export your data at any time by contacting us (see below). There
          is no automatic expiration that destroys your account — if you stop using GEET, it
          remains until you ask us to remove it.
        </p>
      </section>

      <section>
        <h2>Children</h2>
        <p>
          The Service is not directed at children under the minimum age required by local
          law (in most jurisdictions, 13; in others 14 or 16).{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: state the minimum age you enforce]
          </span>
          . We do not knowingly collect personal information from children. If you believe a
          child has given us information, contact us and we will delete it.
        </p>
      </section>

      <section>
        <h2>International transfers</h2>
        <p>
          Our servers and database are hosted in cloud regions that may be outside the
          country where you live.{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: list the countries/regions where data is stored]
          </span>
          . By using the Service you acknowledge this transfer.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          We use HTTPS for all traffic, hash passwords with bcrypt, keep the sign-in session
          cookie HTTP-only and SameSite, and restrict production database and API access to
          trusted servers. No payment or credit-card data is ever collected or stored,
          because the Service is free and has no checkout.
        </p>
      </section>

      <section>
        <h2>Your rights</h2>
        <p>
          Depending on where you live you may have rights to access, correct, delete, and
          obtain a copy (portability) of your personal information, and to withdraw any
          consent you gave. To exercise any of these, tell us via the{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact page
          </a>
          . We will respond within{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: legal response timeline, e.g., 30 days]
          </span>{" "}
          and will ask you to verify your identity first.
        </p>
        <p>
          You can close your account and have your data deleted on request. We do not yet
          offer automated in-app account deletion. Until we add it, deletion requests are
          handled via{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            /contact
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Complaints</h2>
        <p>
          If we don&#39;t resolve a privacy concern, you may complain to your local data
          protection authority.{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: name the supervisory authority / privacy
            regulator you fall under, e.g., the data protection authority for your
            jurisdiction]
          </span>
          .
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy queries:{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            /contact
          </a>
          .{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: dedicated privacy contact email]
          </span>
          .
        </p>
      </section>

      <section>
        <h2>Changes</h2>
        <p>
          We may update this policy as the Service evolves. The &ldquo;Last updated&rdquo; date above
          changes with each revision, and material changes will be highlighted on this page
          for at least 30 days.
        </p>
      </section>
    </LegalArticle>
  );
}