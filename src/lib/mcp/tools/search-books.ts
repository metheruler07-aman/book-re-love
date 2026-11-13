import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const COLS =
  "id,title,author,category,condition,price,rent_per_week,area,seller_id,listed_at,self_deliver,courier";

export default defineTool({
  name: "search_books",
  title: "Search books",
  description:
    "Search approved, available book listings on Book Ledger by title/author text, category, or area.",
  inputSchema: {
    query: z.string().trim().optional().describe("Text to match against title or author."),
    category: z.string().trim().optional().describe("Category, e.g. Fiction, NCERT, Examination."),
    area: z.string().trim().optional().describe("Neighborhood/area name to filter by."),
    max_price: z.number().positive().optional().describe("Maximum price in rupees."),
    limit: z.number().int().min(1).max(50).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, area, max_price, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("books")
      .select(COLS)
      .eq("status", "approved")
      .eq("sold", false)
      .eq("removed", false)
      .order("listed_at", { ascending: false })
      .limit(limit ?? 20);

    const safeQuery = query
      ?.replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    if (safeQuery) q = q.or(`title.ilike.%${safeQuery}%,author.ilike.%${safeQuery}%`);
    if (category) q = q.eq("category", category);
    if (area) q = q.ilike("area", `%${area}%`);
    if (max_price != null) q = q.lte("price", max_price);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { books: data ?? [] },
    };
  },
});
