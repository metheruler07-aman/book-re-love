import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Book Ledger" },
      { name: "description", content: "The terms that govern your use of Book Ledger — buying, selling, renting, buybacks, notes, chat, and calls." },
      { property: "og:title", content: "Terms of Service — Book Ledger" },
      { property: "og:description", content: "The terms that govern your use of Book Ledger." },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground italic">Last updated: [add today's date]</p>
      </header>

      <div className="prose-editorial space-y-8 text-[15px] leading-relaxed text-foreground">
        <Section n="1" title="What Book Ledger is">
          <p>Book Ledger is an online marketplace where people can buy, sell, rent, and buy back books, and buy or sell class notes. Some items are sold by Book Ledger directly. Most are listed by other users (“Sellers”).</p>
        </Section>

        <Section n="2" title="Who can use it">
          <p>You must be at least 18 years old, or have a parent/guardian's permission, to create an account.</p>
        </Section>

        <Section n="3" title="Accounts">
          <ul className="list-disc space-y-1 pl-6">
            <li>You're responsible for keeping your login details safe.</li>
            <li>You must give accurate information about yourself, your listings, and your location.</li>
            <li>We may suspend or block accounts that break these rules — including spamming, sharing contact details to avoid platform fees, posting fake listings, or abusive behavior.</li>
          </ul>
        </Section>

        <Section n="4" title="Buying and selling">
          <ul className="list-disc space-y-1 pl-6">
            <li>Sellers set their own prices and describe their own items honestly (title, author, condition).</li>
            <li>Book Ledger charges a commission on every sale, rental, buyback, and notes purchase. Current rates are shown to sellers before they list an item.</li>
            <li>Payments are processed through our payment partner. Sellers receive their share (price minus commission) according to our payout schedule.</li>
          </ul>
        </Section>

        <Section n="5" title="Delivery">
          <ul className="list-disc space-y-1 pl-6">
            <li>Sellers set a self-delivery distance. Orders within that range may be delivered by the seller directly.</li>
            <li>Orders beyond that range are shipped by courier if the seller allows it; the buyer pays the shipping cost.</li>
            <li>If a seller doesn't ship beyond their range and the buyer is outside it, that order can't be placed.</li>
          </ul>
        </Section>

        <Section n="6" title="Rentals">
          <ul className="list-disc space-y-1 pl-6">
            <li>Rentals are for a fixed period, shown at checkout, and include a refundable deposit.</li>
            <li>Returning the item late or damaged may result in a deduction from the deposit.</li>
          </ul>
        </Section>

        <Section n="7" title="Buybacks">
          <ul className="list-disc space-y-1 pl-6">
            <li>Book Ledger may buy back books it previously sold, at 50% of the original price, adjusted for the book's current condition.</li>
            <li>Buyback offers are calculated automatically and shown before you accept.</li>
          </ul>
        </Section>

        <Section n="8" title="Chat">
          <ul className="list-disc space-y-1 pl-6">
            <li>Messaging between buyers and sellers is provided so you can coordinate a purchase, not to move the transaction off-platform.</li>
            <li>Sharing personal contact details in chat is not allowed and may result in your account being restricted.</li>
            <li>Book Ledger does not offer in-app calling — all coordination happens in chat.</li>
          </ul>
        </Section>


        <Section n="9" title="Prohibited conduct">
          <p>You may not:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>List stolen, counterfeit, or illegal items</li>
            <li>Attempt to avoid platform commission by arranging payment outside the app</li>
            <li>Harass, threaten, or spam other users</li>
            <li>Create multiple accounts to get around a block</li>
          </ul>
        </Section>

        <Section n="10" title="Our right to remove content">
          <p>We may remove any listing or restrict any account that violates these terms, at our discretion.</p>
        </Section>

        <Section n="11" title="Limitation of liability">
          <p>Book Ledger is a platform connecting buyers and sellers. We don't guarantee the condition, authenticity, or delivery of items listed by other users. We're not liable for disputes between buyers and sellers, though we'll assist where we reasonably can.</p>
        </Section>

        <Section n="12" title="Changes to these terms">
          <p>We may update these terms from time to time. Continued use of Book Ledger after changes means you accept the updated terms.</p>
        </Section>

        <Section n="13" title="Contact">
          <p>Questions about these terms: [add your contact email]</p>
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
