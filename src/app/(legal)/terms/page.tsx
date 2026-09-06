import type { Metadata } from "next";
import { LegalArticle } from "../_components/LegalArticle";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalArticle title="Terms of Service" lastUpdated="September 6, 2026">
      <section>
        <h2>1. The Service</h2>
        <p>
          GEET is a free music-listening web application. GEET does not host music. Instead,
          GEET plays audio from YouTube&#39;s official embedded player, uses YouTube&#39;s search
          and metadata tools, and organizes music into your personal feed and playlists. The
          availability of any specific track therefore depends on YouTube, which is a
          third-party service with its own{" "}
          <a
            href="https://www.youtube.com/t/terms"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </a>
          . As a condition of using GEET you also agree to Google&#39;s and YouTube&#39;s terms and
          to their privacy practices as set out in our{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy Policy
          </a>
          .
        </p>
        <p>
          GEET is currently free and does not sell subscriptions, tickets, or merchandise.
          All functionality available today is provided without charge.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          You may use GEET without an account to browse public pages. Browsing the app,
          listening, saving playlists, and getting personal recommendations requires an
          account. You must provide accurate information when signing up, and you must keep
          your password and any Google sign-in confidential.
        </p>
        <p>
          You may not create accounts for another person without their permission, or use a
          deceptive identity. We may suspend accounts that appear compromised or abusive.
        </p>
      </section>

      <section>
        <h2>3. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use GEET to violate any law, or to infringe anyone&#39;s copyright, trademark, or
            other rights.</li>
          <li>Upload, post, or distribute content you don&#39;t have the right to make available
            (GEET does not currently offer uploads, but the rule applies to anything you
            submit through the Service).</li>
          <li>Scrape or bulk-harvest music, metadata, or other users&#39; personal information
            from the Service.</li>
          <li>Attempt to interfere with, reverse-engineer, or break the security of the
            Service or its infrastructure, or to create load that harms others&#39; use.</li>
          <li>Resell or commercially redistribute access to GEET or its data.</li>
        </ul>
      </section>

      <section>
        <h2>4. Content from YouTube</h2>
        <p>
          Music and artwork shown in GEET and played through YouTube are owned by their
          respective rights holders. GEET does not claim ownership of any third-party music.
          You are responsible for your own use of YouTube content, which must comply with
          YouTube&#39;s terms.
        </p>
      </section>

      <section>
        <h2>5. Copyright and takedown</h2>
        <p>
          If you believe content shown in GEET infringes your copyright, contact us at{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: legal/copyright contact email]
          </span>{" "}
          or via the{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact page
          </a>{" "}
          with: (a) a description of the work; (b) a link to where it appears; (c) your
          contact details; and (d) a statement that you believe the use is not authorized.
          We will review the request, and may remove or block access to the relevant
          material while it is under review. Because GEET links to content hosted by
          YouTube, the most effective channel for rights holders is usually YouTube&#39;s own
          reporting tools.
        </p>
      </section>

      <section>
        <h2>6. Termination</h2>
        <p>
          You may stop using GEET at any time and ask us to delete your account via{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            /contact
          </a>
          . We may suspend or close an account for (a) breach of these terms, (b) abusive,
          unlawful, or harmful conduct toward other users or the Service, or (c) failure to
          comply with a request from an authority or rights holder.
        </p>
      </section>

      <section>
        <h2>7. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
          WHETHER EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY,
          FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT TRACKS WILL REMAIN PLAYABLE, AS
          AVAILABILITY DEPENDS IN PART ON YOUTUBE.
        </p>
      </section>

      <section>
        <h2>8. Limitation of liability</h2>
        <p>
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: state any limitation of liability you rely on,
            consistent with local law — for example, &ldquo;to the maximum extent permitted by
            law, GEET and its operators are not liable for indirect, incidental, or
            consequential damages arising from your use of the Service&rdquo;.]
          </span>
        </p>
      </section>

      <section>
        <h2>9. Changes</h2>
        <p>
          We may update these terms from time to time. We&#39;ll post changes on this page and
          update the &ldquo;Last updated&rdquo; date. If a change is material, we&#39;ll highlight it
          here for at least 30 days before it takes effect. Continued use after a change
          means you accept it.
        </p>
      </section>

      <section>
        <h2>10. Governing law</h2>
        <p>
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: governing law and forum — e.g., the laws of Nepal,
            recognizing the Privacy Act 2075 and the Electronic Transactions Act 2063, or
            your jurisdiction. State the courts that would hear disputes.]
          </span>
        </p>
      </section>

      <section>
        <h2>11. Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            /contact
          </a>
          .
        </p>
      </section>
    </LegalArticle>
  );
}