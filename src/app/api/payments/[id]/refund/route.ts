import { z } from "zod";
import { executeRefund } from "@/lib/data/store";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  amount: z.number().positive(),
  reason: z.string().trim().min(3).max(200),
  /** The copilot proposal this confirmation answers, for the audit trail. */
  proposalId: z.string().max(100).optional(),
});

/**
 * The ONLY code path that moves money. It is called from the confirmation card when a human
 * clicks "Confirm refund"; the copilot's proposeRefund tool can never reach it.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid refund request." }, { status: 400 });

  const result = executeRefund(id, parsed.data.amount, parsed.data.reason);
  if (!result.ok) return Response.json({ error: result.error }, { status: 422 });
  return Response.json(result, { status: 201 });
}
