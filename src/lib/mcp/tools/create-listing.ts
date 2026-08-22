import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_listing",
  title: "Create a book listing",
  description:
    "Create a book listing for the signed-in user. The listing starts as pending and only goes live after an admin approves it. Photos must be added in the app.",
  inputSchema: {
    title: z.string().trim().min(1),
    author: z.string().trim().min(1),
    category: z.string().trim().default("Others").optional(),
    condition: z.enum(["new", "like-new", "good", "fair", "worn"]).describe("Condition grade."),
    price: z.number().nonnegative().describe("Asking price in rupees."),
    original_price: z.number().nonnegative().describe("Original/MRP price in rupees."),
    rent_per_week: z.number().nonnegative().optional().describe("Weekly rent, if rentable."),
    area: z.string().trim().optional().describe("Neighborhood/area for handoff."),
    description: z.string().trim().max(2000).optional(),
    self_deliver: z.boolean().default(true).optional(),
    courier: z.boolean().default(false).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("books")
      .insert({
        seller_id: ctx.getUserId()!,
        title: input.title,
        author: input.author,
        category: input.category ?? "Others",
        condition: input.condition,
        price: input.price,
        original_price: input.original_price,
        rent_per_week: input.rent_per_week ?? null,
        ...(input.area ? { area: input.area } : {}),
        description: input.description ?? null,
        self_deliver: input.self_deliver ?? true,
        courier: input.courier ?? false,
      })
      .select("id,title,status")
      .maybeSingle();

    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [
        {
          type: "text",
          text: `Listing created and awaiting admin approval: ${JSON.stringify(data)}. Add photos in the app before it can be approved.`,
        },
      ],
      structuredContent: { listing: data },
    };
  },
});
