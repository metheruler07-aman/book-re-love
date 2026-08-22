import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description:
    "List orders where the signed-in user is the buyer or the seller (purchases, sales, rentals).",
  inputSchema: {
    role: z.enum(["buyer", "seller", "any"]).default("any").optional(),
    limit: z.number().int().min(1).max(50).default(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ role, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId()!;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("orders")
      .select(
        "id,kind,status,amount,commission_amount,payment_method,settlement,delivery_mode,rental_weeks,book_id,note_id,buyer_id,seller_id,created_at,delivered_at",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);

    if (role === "buyer") q = q.eq("buyer_id", userId);
    else if (role === "seller") q = q.eq("seller_id", userId);
    else q = q.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
