"use client";

import { Button, Skeleton } from "@/components/ui";
import { PAGE_SIZE, usePayments } from "@/lib/payments/api-client";
import { formatMoney } from "@/lib/payments/money";
import { METHOD_LABELS, REASON_LABELS } from "@/lib/payments/types";
import { useDashboardStore } from "@/stores/dashboard-store";
import { StatusBadge } from "./status-badge";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

export function PaymentsTable() {
  const filters = useDashboardStore((s) => s.filters);
  const page = useDashboardStore((s) => s.page);
  const setPage = useDashboardStore((s) => s.setPage);
  const { data, isPending, isError, isFetching } = usePayments(filters, page);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
        <table className="w-full min-w-[720px] text-left text-sm" aria-busy={isFetching}>
          <caption className="sr-only">
            Payments, newest first. {data ? `${data.total} results.` : "Loading."}
          </caption>
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                ID
              </th>
              <th scope="col" className="px-3 py-2.5">
                Date (UTC)
              </th>
              <th scope="col" className="px-3 py-2.5">
                Merchant
              </th>
              <th scope="col" className="px-3 py-2.5">
                Method
              </th>
              <th scope="col" className="px-3 py-2.5">
                Status
              </th>
              <th scope="col" className="px-3 py-2.5">
                Reason
              </th>
              <th scope="col" className="px-3 py-2.5 text-right">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isPending &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-3 py-2.5">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {isError && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-rose-600">
                  Couldn&apos;t load payments.
                </td>
              </tr>
            )}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  No payments match these filters.
                </td>
              </tr>
            )}
            {data?.items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50" data-testid="payment-row">
                <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{p.id}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
                  {dateFmt.format(new Date(p.createdAt))}
                </td>
                <td className="px-3 py-2.5 text-slate-800">
                  {p.merchant}
                  <span className="ml-1 text-xs text-slate-400">{p.country}</span>
                </td>
                <td className="px-3 py-2.5 text-slate-600">{METHOD_LABELS[p.method]}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-3 py-2.5 text-xs text-slate-500">
                  {p.rejectionReason ? REASON_LABELS[p.rejectionReason] : "—"}
                </td>
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap text-slate-900 tabular-nums">
                  {formatMoney(p.amount, p.currency)}
                  {p.refundedAmount > 0 && p.status !== "refunded" && (
                    <span className="block text-[11px] font-normal text-sky-600">
                      −{formatMoney(p.refundedAmount, p.currency)} refunded
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav
        aria-label="Pagination"
        className="flex items-center justify-between gap-2 text-xs text-slate-500"
      >
        <span data-testid="results-count">
          {data ? `${data.total} payment${data.total === 1 ? "" : "s"}` : "…"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span aria-current="page">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}
