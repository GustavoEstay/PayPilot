"use client";

import { Card, Skeleton } from "@/components/ui";
import type { PaymentsSummary } from "@/lib/payments/types";
import { formatCompactUsd, formatPercent } from "@/lib/payments/money";

interface Kpi {
  label: string;
  value: string;
  hint: string;
}

function toKpis(s: PaymentsSummary): Kpi[] {
  return [
    { label: "Approved volume", value: formatCompactUsd(s.approvedUsd), hint: "USD equivalent" },
    { label: "Approval rate", value: formatPercent(s.approvalRate), hint: "Excludes pending" },
    { label: "Payments", value: s.totalCount.toLocaleString("en-US"), hint: "In selection" },
    { label: "Refunded", value: formatCompactUsd(s.refundedUsd), hint: "USD equivalent" },
  ];
}

export function KpiCards({ summary }: { summary: PaymentsSummary | undefined }) {
  return (
    <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {summary
        ? toKpis(summary).map((k) => (
            <Card key={k.label} className="p-4">
              <p className="text-xs font-medium text-slate-500">{k.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
                {k.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">{k.hint}</p>
            </Card>
          ))
        : Array.from({ length: 4 }, (_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-7 w-20" />
            </Card>
          ))}
    </section>
  );
}
