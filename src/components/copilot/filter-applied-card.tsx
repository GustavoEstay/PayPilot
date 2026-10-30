"use client";

import { useEffect } from "react";
import { Badge, Button } from "@/components/ui";
import type { FilterPaymentsOutput } from "@/lib/ai/tools";
import { METHOD_LABELS, REASON_LABELS, STATUS_LABELS } from "@/lib/payments/types";
import { useDashboardStore } from "@/stores/dashboard-store";

/** Renders the filterPayments result AND applies it to the dashboard (once per tool call). */
export function FilterAppliedCard({
  toolCallId,
  output,
}: {
  toolCallId: string;
  output: FilterPaymentsOutput;
}) {
  const applyCopilotFilters = useDashboardStore((s) => s.applyCopilotFilters);
  const setFilters = useDashboardStore((s) => s.setFilters);

  useEffect(() => {
    applyCopilotFilters(toolCallId, output.filters);
  }, [applyCopilotFilters, toolCallId, output.filters]);

  const { status, method, reason, dateRange } = output.filters;
  const chips = [
    status && `Status: ${STATUS_LABELS[status]}`,
    method && `Method: ${METHOD_LABELS[method]}`,
    reason && `Reason: ${REASON_LABELS[reason]}`,
    dateRange && `${dateRange.from} → ${dateRange.to}`,
  ].filter(Boolean) as string[];

  return (
    <div
      data-testid="filter-applied-card"
      className="rounded-lg bg-white p-3 ring-1 ring-slate-200"
      role="group"
      aria-label="Filters applied to the table"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">Applied to payments table</p>
        <span className="text-xs text-slate-500 tabular-nums">{output.matchCount} matches</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <Badge key={c} tone="brand">
            {c}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 -ml-2"
        onClick={() => setFilters(output.filters, "copilot")}
      >
        Re-apply
      </Button>
    </div>
  );
}
