"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import type { ProposeRefundOutput } from "@/lib/ai/tools";
import { useConfirmRefund } from "@/lib/payments/api-client";
import { formatMoney } from "@/lib/payments/money";

type Decision = "pending" | "cancelled";

/**
 * Human-in-the-loop gate. The copilot only proposed this refund; money moves exclusively
 * when the user clicks "Confirm refund", which calls the refund endpoint directly.
 */
export function RefundConfirmCard({
  toolCallId,
  output,
}: {
  toolCallId: string;
  output: ProposeRefundOutput;
}) {
  const [decision, setDecision] = useState<Decision>("pending");
  const refund = useConfirmRefund();

  if (output.status === "rejected") {
    return (
      <div
        data-testid="refund-rejected-card"
        role="alert"
        className="rounded-lg bg-rose-50 p-3 text-xs text-rose-800 ring-1 ring-rose-200"
      >
        Refund for {output.paymentId} can&apos;t be proposed: {output.error}
      </div>
    );
  }

  const done = refund.isSuccess;
  const titleId = `refund-title-${toolCallId}`;

  return (
    <div
      data-testid="refund-confirm-card"
      role="group"
      aria-labelledby={titleId}
      className="rounded-lg bg-white p-3 ring-1 ring-amber-300"
    >
      <div className="flex items-center justify-between gap-2">
        <p id={titleId} className="text-xs font-semibold text-slate-800">
          Refund proposal · <span className="font-mono">{output.paymentId}</span>
        </p>
        {done ? (
          <Badge tone="success">Refunded</Badge>
        ) : decision === "cancelled" ? (
          <Badge>Cancelled</Badge>
        ) : (
          <Badge tone="warning">Needs approval</Badge>
        )}
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-slate-500">Merchant</dt>
        <dd className="text-slate-800">{output.merchant}</dd>
        <dt className="text-slate-500">Amount</dt>
        <dd className="font-semibold text-slate-900 tabular-nums">
          {formatMoney(output.amount, output.currency)}
          {output.isPartial && (
            <span className="ml-1 font-normal text-slate-500">
              of {formatMoney(output.refundable, output.currency)} refundable
            </span>
          )}
        </dd>
        <dt className="text-slate-500">Reason</dt>
        <dd className="text-slate-800">{output.reason}</dd>
      </dl>

      {refund.isError && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {refund.error.message}
        </p>
      )}

      <div aria-live="polite">
        {done ? (
          <p className="mt-3 text-xs text-emerald-700" data-testid="refund-success">
            Refund {refund.data.refund.refundId} executed for{" "}
            {formatMoney(refund.data.refund.amount, output.currency)}. The dashboard has been
            updated.
          </p>
        ) : decision === "cancelled" ? (
          <p className="mt-3 text-xs text-slate-500">No refund was made.</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="danger"
              loading={refund.isPending}
              onClick={() =>
                refund.mutate({
                  paymentId: output.paymentId,
                  amount: output.amount,
                  reason: output.reason,
                  proposalId: toolCallId,
                })
              }
            >
              Confirm refund
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={refund.isPending}
              onClick={() => setDecision("cancelled")}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
