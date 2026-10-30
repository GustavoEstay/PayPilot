import type { SalesDropAnalysis } from "@/lib/payments/analytics";
import { formatMoney } from "@/lib/payments/money";
import { METHOD_LABELS, REASON_LABELS, STATUS_LABELS } from "@/lib/payments/types";
import type { FilterPaymentsOutput, ProposeRefundOutput } from "../tools";

export const HELP_TEXT =
  "I'm PayPilot's copilot (running on the offline mock provider). I can:\n" +
  '- **Explain a sales drop**: "Why did sales drop in the last 7 days?"\n' +
  '- **Filter the payments table**: "Show rejected card payments from the last 7 days"\n' +
  '- **Prepare a refund** for you to confirm: "Refund PAY-0426 because the customer was charged twice"';

/** Text the mock model writes after a tool result, mirroring what a real LLM would summarize. */
export function summarizeToolResult(toolName: string, output: unknown): string {
  switch (toolName) {
    case "analyzeSalesDrop": {
      const a = output as SalesDropAnalysis;
      if (!a.isDrop) return `${a.headline} ${a.explanation}`;
      const method = a.segments.find((s) => s.dimension === "method");
      const next = method
        ? ` Next step: ask me to "show rejected ${method.label.toLowerCase()} payments from the last ${a.range.replace("d", "")} days" to inspect the affected transactions.`
        : "";
      return `${a.headline}\n\n${a.explanation}${next}`;
    }
    case "filterPayments": {
      const { filters, matchCount } = output as FilterPaymentsOutput;
      const parts: string[] = [];
      if (filters.status) parts.push(STATUS_LABELS[filters.status].toLowerCase());
      if (filters.method) parts.push(METHOD_LABELS[filters.method].toLowerCase());
      parts.push("payments");
      if (filters.reason) parts.push(`rejected for "${REASON_LABELS[filters.reason]}"`);
      if (filters.dateRange)
        parts.push(`from ${filters.dateRange.from} to ${filters.dateRange.to}`);
      return `Done. The table now shows ${parts.join(" ")}: **${matchCount}** match${matchCount === 1 ? "" : "es"}. You can tweak or clear the filters above the table.`;
    }
    case "proposeRefund": {
      const r = output as ProposeRefundOutput;
      if (r.status === "rejected") return `I can't propose that refund: ${r.error}`;
      return `I've prepared a ${r.isPartial ? "partial" : "full"} refund of **${formatMoney(r.amount, r.currency)}** for ${r.paymentId} (${r.merchant}). Nothing has been refunded yet. Review the details and click **Confirm refund** to execute it.`;
    }
    default:
      return "Done.";
  }
}
