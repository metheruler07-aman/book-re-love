import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Book Ledger" },
      { name: "description", content: "How Book Ledger collects, uses, and protects your data as a reader, seller, or buyer on the platform." },
      { property: "og:title", content: "Privacy Policy — Book Ledger" },
      { property: "og:description", content: "How Book Ledger collects, uses, and protects your data." },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground italic">Last updated: [add today's date]</p>
      </header>

      <div className="space-y-8 text-[15px] leading-relaxed text-foreground">
        <Section n="1" title="What we collect">
          <ul className="list-disc space-y-1 pl-6">
            <li><b className="text-foreground">Account info:</b> name, email or phone number, area/location, and (for sellers) delivery radius</li>
            <li><b className="text-foreground">Listings:</b> books or notes you list, prices, condition, photos</li>
            <li><b className="text-foreground">Transactions:</b> purchases, rentals, buybacks, and payment confirmations</li>
            <li><b className="text-foreground">Messages:</b> chat messages between buyers and sellers, so we can moderate for policy violations (like shared phone numbers)</li>
            <li><b className="text-foreground">Usage data:</b> basic technical info like device type and app usage, to fix bugs and improve the app</li>
          </ul>
        </Section>

        <Section n="2" title="How we use it">
          <ul className="list-disc space-y-1 pl-6">
            <li>To run the marketplace: show listings, process orders, calculate payouts and commission</li>
            <li>To calculate delivery options based on your area and a seller's self-delivery radius</li>
            <li>To detect and prevent spam, fraud, or attempts to bypass platform fees</li>
            <li>To contact you about your orders or account</li>
          </ul>
        </Section>

        <Section n="3" title="What we don't do">
          <ul className="list-disc space-y-1 pl-6">
            <li>We don't sell your personal data to advertisers.</li>
            <li>Your phone number and address are never shown to other users — only the admin team can see them.</li>
          </ul>
        </Section>

        <Section n="4" title="Who we share data with">
          <ul className="list-disc space-y-1 pl-6">
            <li><b className="text-foreground">Payment processor</b> (e.g. Razorpay), to process payments and payouts — they receive only what's needed to complete a transaction.</li>
            <li><b className="text-foreground">Delivery/courier partners</b>, for orders that ship beyond a seller's self-delivery range.</li>
            <li><b className="text-foreground">Law enforcement</b>, only if legally required.</li>
          </ul>
        </Section>

        <Section n="5" title="Data storage and security">
          <p>Your data is stored securely using industry-standard practices. We take reasonable steps to protect it, but no system is 100% secure.</p>
        </Section>

        <Section n="6" title="Your choices">
          <ul className="list-disc space-y-1 pl-6">
            <li>You can update your account info (name, area, delivery radius) at any time.</li>
            <li>You can request that we delete your account and associated data by contacting us.</li>
          </ul>
        </Section>

        <Section n="7" title="Children's privacy">
          <p>Book Ledger is not intended for children under 13. We don't knowingly collect data from children under 13.</p>
        </Section>

        <Section n="8" title="Changes to this policy">
          <p>We may update this policy from time to time. We'll note the date of the latest update at the top.</p>
        </Section>

        <Section n="9" title="Contact">
          <p>Questions about your data: [add your contact email]</p>
        </Section>
      </div>
    </article>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">
        <span className="mr-2 text-muted-foreground">{n}.</span>{title}
      </h2>
      <div className="mt-3 space-y-2 text-muted-foreground">{children}</div>
    </section>
  );
}
