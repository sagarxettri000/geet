import type { Metadata } from "next";
import { LegalArticle } from "../_components/LegalArticle";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundsPage() {
  return (
    <LegalArticle title="Refund Policy" lastUpdated="September 6, 2026">
      <section>
        <h2>No payments, no refunds needed</h2>
        <p>
          GEET is currently a <strong>free</strong> service. We do not charge for accounts,
          subscriptions, tracks, or any other feature, and we do not collect payment
          information or credit-card data anywhere in the Service.
        </p>
        <p>
          Because there are no purchases, there are no refunds to process. If you ever paid
          for something that looks like it came from GEET, it did not come from us — do not
          share payment details, and contact us via{" "}
          <a href="/contact" className="underline underline-offset-2 hover:text-foreground">
            /contact
          </a>
          .
        </p>
      </section>
      <section>
        <h2>The future</h2>
        <p>
          {" "}
          <span className="text-[#8B5CF6]">
            [OWNER CONFIRMATION REQUIRED: if GEET ever introduces paid features, add the
            applicable refund window and cancellation rules here.]
          </span>
        </p>
      </section>
    </LegalArticle>
  );
}