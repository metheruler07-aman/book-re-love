import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_book",
  title: "Get book listing",
  description: "Fetch the full details of one Book Ledger listing by its id (photos excluded).",
  inputSchema: { id: z.string().uuid().describe("Listing id.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("books")
      .select(
        "id,title,author,category,description,condition,price,original_price,rent_per_week,area,status,sold,removed,seller_id,listed_at,self_deliver,courier,delivery_deadline_days,buyback_window_days,chat_activated",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Listing not found" }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { book: data },
    };
  },
});
