"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui";
import type { SalesDropAnalysis } from "@/lib/payments/analytics";
import { formatDayShort } from "@/lib/payments/dates";
import { formatCompactUsd, formatMoney, formatPercent } from "@/lib/payments/money";

export function SalesDropCard({ analysis }: { analysis: SalesDropAnalysis }) {
  const data = analysis.series.map((d) => ({
    ...d,
    previous: d.period === "previous" ? d.approvedUsd : null,
    current: d.period === "current" ? d.approvedUsd : null,
  }));
  const change = analysis.volumeChange;

  return (
    <div
      data-testid="sales-drop-card"
      className="rounded-lg bg-white p-3 ring-1 ring-slate-200"
      role="group"
      aria-label="Sales drop analysis"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-700">
          Approved volume · last {analysis.range.replace("d", "")} days vs. previous
        </p>
        <Badge tone={change < 0 ? "danger" : "success"}>
          {change < 0 ? "▼" : "▲"} {formatPercent(Math.abs(change), 0)}
        </Badge>
      </div>
      <div className="mt-2 h-36" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDayShort}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompactUsd(v)}
              tick={{ fontSize: 10, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              formatter={(v, name) => [
                formatMoney(Number(v)),
                name === "current" ? "Current" : "Previous",
              ]}
              labelFormatter={(l) => formatDayShort(String(l))}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar
              dataKey="previous"
              fill="#cbd5e1"
              radius={[3, 3, 0, 0]}
              isAnimationActive={false}
            />
            <Bar dataKey="current" fill="#e11d48" radius={[3, 3, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex gap-3 text-[11px] text-slate-500" aria-hidden>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-slate-300" /> Previous
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-sm bg-rose-600" /> Current
        </span>
      </p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-slate-500">Volume</dt>
          <dd className="font-medium text-slate-900 tabular-nums">
            {formatCompactUsd(analysis.previous.approvedUsd)} →{" "}
            {formatCompactUsd(analysis.current.approvedUsd)}
          </dd>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <dt className="text-slate-500">Approval rate</dt>
          <dd className="font-medium text-slate-900 tabular-nums">
            {formatPercent(analysis.previous.approvalRate, 0)} →{" "}
            {formatPercent(analysis.current.approvalRate, 0)}
          </dd>
        </div>
      </dl>
      {analysis.isDrop && (
        <div className="mt-2">
          <p className="text-xs font-medium text-slate-600">Main drivers</p>
          <ul className="mt-1 space-y-1 text-xs text-slate-700">
            {analysis.segments.slice(0, 2).map((s) => (
              <li key={s.segment} className="flex justify-between gap-2">
                <span>{s.label}</span>
                <span className="font-medium text-rose-600 tabular-nums">
                  {s.deltaPp.toFixed(0)} pp approval
                </span>
              </li>
            ))}
            {analysis.reasons[0] && (
              <li className="flex justify-between gap-2">
                <span>{analysis.reasons[0].label}</span>
                <span className="font-medium text-rose-600 tabular-nums">
                  {analysis.reasons[0].previousCount} → {analysis.reasons[0].currentCount}{" "}
                  rejections
                </span>
              </li>
            )}
          </ul>
        </div>
      )}
      <p className="sr-only">{analysis.headline}</p>
    </div>
  );
}
