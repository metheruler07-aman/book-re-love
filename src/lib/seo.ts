export const SITE_ORIGIN = "https://book-re-love.lovable.app";
export const HOME_TITLE = "Book Ledger: buy, sell and rent used books near you";
export const HOME_DESCRIPTION =
  "Find pre-loved books near you. Browse local listings, compare prices and condition, then connect with readers to buy, sell, or rent books in your area.";

export function siteUrl(path: string) {
  return new URL(path, SITE_ORIGIN).toString();
}

export function pageSeo(title: string, description: string, path: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: siteUrl(path) },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "canonical", href: siteUrl(path) }],
  };
}
