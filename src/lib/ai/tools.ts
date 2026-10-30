import { tool, type InferUITools, type UIDataTypes, type UIMessage } from "ai";
import { z } from "zod";
import { checkRefund, getPayment, getPayments } from "@/lib/data/store";
import { analyzeSalesDrop, type SalesDropAnalysis } from "@/lib/payments/analytics";
import { applyFilters, dateRangeSchema, normalizeFilters } from "@/lib/payments/filters";
import {
  METHODS,
  REJECTION_REASONS,
  STATUSES,
  type Currency,
  type PaymentFilters,
} from "@/lib/payments/types";

/* ------------------------------------------------------------------ */
/* Pure tool implementations (unit-tested without the AI SDK).         */
/* ------------------------------------------------------------------ */

export const analyzeSalesDropInput = z.object({
  range: z
    .enum(["7d", "14d", "30d"])
    .default("7d")
    .describe("Window to analyze, compared against the window of equal length right before it."),
});

export function runAnalyzeSalesDrop(input: z.infer<typeof analyzeSalesDropInput>) {
  return analyzeSalesDrop(getPayments(), input.range);
}

export const filterPaymentsInput = z.object({
  status: z.enum(STATUSES).optional().describe("Payment status"),
  reason: z.enum(REJECTION_REASONS).optional().describe("Rejection reason (rejected payments)"),
  method: z.enum(METHODS).optional().describe("Payment method"),
  dateRange: dateRangeSchema
    .optional()
    .describe("Inclusive range, YYYY-MM-DD. The dataset ends on 2026-10-29."),
});

export interface FilterPaymentsOutput {
  filters: PaymentFilters;
  matchCount: number;
}

export function runFilterPayments(
  input: z.infer<typeof filterPaymentsInput>,
): FilterPaymentsOutput {
  // A rejection reason implies rejected payments; make that explicit for the UI.
  const filters = normalizeFilters({
    ...input,
    status: input.status ?? (input.reason ? "rejected" : undefined),
  });
  return { filters, matchCount: applyFilters(getPayments(), filters).length };
}

export const proposeRefundInput = z.object({
  paymentId: z
    .string()
    .regex(/^PAY-\d{4}$/i, "Payment ids look like PAY-0042")
    .describe("Payment id, e.g. PAY-0042"),
  amount: z
    .number()
    .positive()
    .optional()
    .describe("Amount in the payment currency. Omit for a full refund."),
  reason: z.string().trim().min(3).max(200).describe("Why the refund is being issued"),
});

export type ProposeRefundOutput =
  | {
      status: "awaiting_confirmation";
      paymentId: string;
      amount: number;
      currency: Currency;
      refundable: number;
      reason: string;
      merchant: string;
      createdAt: string;
      isPartial: boolean;
    }
  | { status: "rejected"; paymentId: string; error: string };

/**
 * Human-in-the-loop: this tool NEVER moves money. It validates and returns a proposal that the
 * UI renders as a confirmation card. Only the user's click on "Confirm" calls the refund endpoint.
 */
export function runProposeRefund(input: z.infer<typeof proposeRefundInput>): ProposeRefundOutput {
  const paymentId = input.paymentId.toUpperCase();
  const check = checkRefund(getPayment(paymentId), input.amount);
  if (!check.ok) return { status: "rejected", paymentId, error: check.error };
  return {
    status: "awaiting_confirmation",
    paymentId,
    amount: check.amount,
    currency: check.payment.currency,
    refundable: check.refundable,
    reason: input.reason,
    merchant: check.payment.merchant,
    createdAt: check.payment.createdAt,
    isPartial: check.amount < check.refundable,
  };
}

/* ------------------------------------------------------------------ */
/* AI SDK tool definitions.                                            */
/* ------------------------------------------------------------------ */

export const copilotTools = {
  analyzeSalesDrop: tool({
    description:
      "Explain a drop in approved sales: compares a recent window with the previous one and returns a daily series plus the segments and rejection reasons driving the change. The UI renders a chart.",
    inputSchema: analyzeSalesDropInput,
    execute: async (input): Promise<SalesDropAnalysis> => runAnalyzeSalesDrop(input),
  }),
  filterPayments: tool({
    description:
      "Apply filters to the payments table on the dashboard. Use when the user wants to see, list or filter payments.",
    inputSchema: filterPaymentsInput,
    execute: async (input): Promise<FilterPaymentsOutput> => runFilterPayments(input),
  }),
  proposeRefund: tool({
    description:
      "Propose a refund for an approved payment. This does NOT execute the refund; the user must confirm it in the UI.",
    inputSchema: proposeRefundInput,
    execute: async (input): Promise<ProposeRefundOutput> => runProposeRefund(input),
  }),
};

export type CopilotTools = InferUITools<typeof copilotTools>;
export type CopilotUIMessage = UIMessage<never, UIDataTypes, CopilotTools>;
export type CopilotToolName = keyof typeof copilotTools;
