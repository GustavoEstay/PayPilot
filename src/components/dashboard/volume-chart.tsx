"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui";
import { formatDayShort } from "@/lib/payments/dates";
import { formatCompactUsd, formatMoney } from "@/lib/payments/money";
import type { DailyPoint } from "@/lib/payments/types";

export function VolumeChart({ series }: { series: DailyPoint[] | undefined }) {
  const total = series?.reduce((s, d) => s + d.approvedUsd, 0) ?? 0;
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Approved volume per day</CardTitle>
          <CardDescription>USD equivalent, follows the table filters</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {series ? (
          <figure>
            <div className="h-56 w-full" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="vol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDayShort}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    tickFormatter={(v: number) => formatCompactUsd(v)}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                  />
                  <Tooltip
                    formatter={(v) => [formatMoney(Number(v)), "Approved"]}
                    labelFormatter={(l) => formatDayShort(String(l))}
                    contentStyle={{ borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="approvedUsd"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fill="url(#vol)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <figcaption className="sr-only">
              Daily approved volume across {series.length} days, totalling {formatMoney(total)}.
            </figcaption>
          </figure>
        ) : (
          <Skeleton className="h-56 w-full" />
        )}
      </CardContent>
    </Card>
  );
}
