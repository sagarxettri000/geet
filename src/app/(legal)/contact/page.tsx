import type { Metadata } from "next";
import { LegalArticle } from "../_components/LegalArticle";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <LegalArticle title="Contact" lastUpdated="September 6, 2026">
      <section>
        <h2>How to reach us</h2>
        <p>
          GEET is a small service and does not have a support portal. Please use the address
          below and include the account email you use on GEET so we can verify you.
        </p>
        <p className="rounded-xl border border-border bg-surface p-4">
          Contact email:{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: public support email]
          </span>
          <br />
          Suggested subject:{" "}
          <strong>GEET enquiry</strong>
          <br />
          Typical response time:{" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: response window, e.g., within 5 business days]
          </span>
        </p>
        <p>
          For urgent security issues, please start the subject with{" "}
          <strong>SECURITY</strong>.
        </p>
      </section>
      <section>
        <h2>What we handle by email</h2>
        <ul>
          <li>Account access issues and account deletion / data export requests.</li>
          <li>Privacy questions and rights requests.</li>
          <li>Copyright and takedown notices (see the{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms
            </a>{" "}
            section on copyright).</li>
          <li>Anything else about GEET.</li>
        </ul>
      </section>
      <section>
        <h2>What we can&#39;t help with</h2>
        <p>
          GEET plays music from YouTube. If a video is unavailable, blocked, or removed,
          that is controlled by YouTube and its rights holders. We recommend using
          YouTube&apos;s reporting tools for copyright matters.
        </p>
      </section>
    </LegalArticle>
  );
}