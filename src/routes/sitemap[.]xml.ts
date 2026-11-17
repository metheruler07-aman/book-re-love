import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { siteUrl } from "@/lib/seo";

const STATIC_PATHS = [
  "/",
  "/browse",
  "/notes",
  "/community",
  "/recommendations",
  "/privacy",
  "/terms",
];

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { data: books, error } = await supabase
          .from("books")
          .select("id, listed_at")
          .eq("status", "approved")
          .eq("sold", false)
          .eq("removed", false)
          .order("listed_at", { ascending: false })
          .limit(1000);

        if (error) {
          console.error("Could not load books for sitemap", error);
          return new Response("Could not generate sitemap", {
            status: 500,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
          });
        }

        const urls = [
          ...STATIC_PATHS.map((path) => `<url><loc>${escapeXml(siteUrl(path))}</loc></url>`),
          ...(books ?? []).map(
            (book) =>
              `<url><loc>${escapeXml(siteUrl(`/book/${encodeURIComponent(book.id)}`))}</loc><lastmod>${escapeXml(book.listed_at)}</lastmod></url>`,
          ),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
