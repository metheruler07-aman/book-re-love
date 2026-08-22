import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_listings",
  title: "List my listings",
  description: "List the signed-in user's own book listings, including pending and rejected ones.",
  inputSchema: {
    status: z
      .enum(["pending", "approved", "rejected"])
      .optional()
      .describe("Filter by moderation status."),
    limit: z.number().int().min(1).max(50).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("books")
      .select(
        "id,title,author,category,condition,price,rent_per_week,area,status,sold,removed,rejection_note,listed_at",
      )
      .eq("seller_id", ctx.getUserId()!)
      .order("listed_at", { ascending: false })
      .limit(limit ?? 20);
    if (status) q = q.eq("status", status);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
