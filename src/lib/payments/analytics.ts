import {
  DATA_END_DATE,
  DATA_START_DATE,
  addDays,
  dayOf,
  daysBetween,
  inRange,
  lastNDays,
} from "./dates";
import { round2, toUsd } from "./money";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  METHODS,
  METHOD_LABELS,
  REASON_LABELS,
  REJECTION_REASONS,
  type Country,
  type DailyPoint,
  type DateRange,
  type Payment,
  type PaymentMethod,
  type PaymentsSummary,
  type RejectionReason,
} from "./types";

/** A payment counts as an approved sale if it was approved (even if later refunded). */
function isSale(p: Payment): boolean {
  return p.status === "approved" || p.status === "refunded";
}

/** Settled = has a final authorization decision (pending excluded from rates). */
function isSettled(p: Payment): boolean {
  return p.status !== "pending";
}

interface PeriodMetrics {
  range: DateRange;
  count: number;
  approvedUsd: number;
  approvalRate: number;
}

function metricsFor(payments: readonly Payment[], range: DateRange): PeriodMetrics {
  const inPeriod = payments.filter((p) => inRange(dayOf(p.createdAt), range));
  const settled = inPeriod.filter(isSettled);
  const sales = inPeriod.filter(isSale);
  return {
    range,
    count: inPeriod.length,
    approvedUsd: round2(sales.reduce((s, p) => s + toUsd(p.amount, p.currency), 0)),
    approvalRate: settled.length ? sales.length / settled.length : 0,
  };
}

export function dailySeries(payments: readonly Payment[], range: DateRange): DailyPoint[] {
  const byDay = new Map<string, DailyPoint>(
    daysBetween(range).map((date) => [
      date,
      { date, approvedUsd: 0, approvedCount: 0, rejectedCount: 0 },
    ]),
  );
  for (const p of payments) {
    const point = byDay.get(dayOf(p.createdAt));
    if (!point) continue;
    if (isSale(p)) {
      point.approvedUsd += toUsd(p.amount, p.currency);
      point.approvedCount += 1;
    } else if (p.status === "rejected") {
      point.rejectedCount += 1;
    }
  }
  return [...byDay.values()].map((d) => ({ ...d, approvedUsd: round2(d.approvedUsd) }));
}

export function summarize(payments: readonly Payment[], range: DateRange): PaymentsSummary {
  const m = metricsFor(payments, range);
  const refundedUsd = payments
    .filter((p) => inRange(dayOf(p.createdAt), range))
    .reduce((s, p) => s + toUsd(p.refundedAmount, p.currency), 0);
  return {
    totalCount: m.count,
    approvedUsd: m.approvedUsd,
    approvalRate: m.approvalRate,
    refundedUsd: round2(refundedUsd),
    series: dailySeries(payments, range),
  };
}

export const SALES_DROP_RANGES = { "7d": 7, "14d": 14, "30d": 30 } as const;
export type SalesDropRange = keyof typeof SALES_DROP_RANGES;

export interface SegmentDriver {
  dimension: "method" | "country";
  segment: PaymentMethod | Country;
  label: string;
  previousApprovalRate: number;
  currentApprovalRate: number;
  /** Change in percentage points. */
  deltaPp: number;
  currentCount: number;
}

export interface ReasonDriver {
  reason: RejectionReason;
  label: string;
  previousCount: number;
  currentCount: number;
}

export interface SalesDropAnalysis {
  range: SalesDropRange;
  current: PeriodMetrics;
  previous: PeriodMetrics;
  /** Relative change of approved volume, e.g. -0.32. */
  volumeChange: number;
  approvalRateDeltaPp: number;
  isDrop: boolean;
  series: (DailyPoint & { period: "previous" | "current" })[];
  segments: SegmentDriver[];
  reasons: ReasonDriver[];
  headline: string;
  explanation: string;
}

function rateFor(payments: readonly Payment[]): number {
  const settled = payments.filter(isSettled);
  return settled.length ? settled.filter(isSale).length / settled.length : 0;
}

const pct = (r: number) => `${(r * 100).toFixed(0)}%`;
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function analyzeSalesDrop(
  payments: readonly Payment[],
  range: SalesDropRange,
  end: string = DATA_END_DATE,
): SalesDropAnalysis {
  const days = SALES_DROP_RANGES[range];
  const currentRange = lastNDays(days, end);
  const previousRange = lastNDays(days, addDays(currentRange.from, -1));
  const current = metricsFor(payments, currentRange);
  const previous = metricsFor(payments, previousRange);

  const volumeChange = previous.approvedUsd
    ? (current.approvedUsd - previous.approvedUsd) / previous.approvedUsd
    : 0;
  const approvalRateDeltaPp = (current.approvalRate - previous.approvalRate) * 100;
  const isDrop = volumeChange <= -0.05 || approvalRateDeltaPp <= -5;

  const inCur = payments.filter((p) => inRange(dayOf(p.createdAt), currentRange));
  const inPrev = payments.filter((p) => inRange(dayOf(p.createdAt), previousRange));

  const segments: SegmentDriver[] = [
    ...METHODS.map((m) => ({ dimension: "method" as const, segment: m, label: METHOD_LABELS[m] })),
    ...COUNTRIES.map((c) => ({
      dimension: "country" as const,
      segment: c,
      label: COUNTRY_LABELS[c],
    })),
  ]
    .map(({ dimension, segment, label }) => {
      const match = (p: Payment) =>
        dimension === "method" ? p.method === segment : p.country === segment;
      const cur = inCur.filter(match);
      const prev = inPrev.filter(match);
      const currentApprovalRate = rateFor(cur);
      const previousApprovalRate = rateFor(prev);
      return {
        dimension,
        segment,
        label,
        previousApprovalRate,
        currentApprovalRate,
        deltaPp: round2((currentApprovalRate - previousApprovalRate) * 100),
        currentCount: cur.length,
      };
    })
    .filter((s) => s.currentCount >= 5)
    .sort((a, b) => a.deltaPp - b.deltaPp);

  const reasons: ReasonDriver[] = REJECTION_REASONS.map((reason) => ({
    reason,
    label: REASON_LABELS[reason],
    previousCount: inPrev.filter((p) => p.rejectionReason === reason).length,
    currentCount: inCur.filter((p) => p.rejectionReason === reason).length,
  }))
    .filter((r) => r.currentCount + r.previousCount > 0)
    .sort((a, b) => b.currentCount - b.previousCount - (a.currentCount - a.previousCount));

  const series = [
    ...dailySeries(payments, previousRange).map((d) => ({ ...d, period: "previous" as const })),
    ...dailySeries(payments, currentRange).map((d) => ({ ...d, period: "current" as const })),
  ];

  const changeWord = volumeChange < 0 ? "fell" : "rose";
  const headline = `Approved volume ${changeWord} ${pct(Math.abs(volumeChange))} (${usd(previous.approvedUsd)} → ${usd(current.approvedUsd)}) in the last ${days} days vs. the previous ${days}.`;

  let explanation: string;
  if (!isDrop) {
    explanation = `There is no significant drop: approval rate moved ${approvalRateDeltaPp.toFixed(1)} pp (${pct(previous.approvalRate)} → ${pct(current.approvalRate)}).`;
  } else {
    const worst = segments.slice(0, 2);
    const topReason = reasons[0];
    const parts = [
      `Approval rate went from ${pct(previous.approvalRate)} to ${pct(current.approvalRate)} (${approvalRateDeltaPp.toFixed(1)} pp).`,
    ];
    if (worst.length)
      parts.push(
        `The hit is concentrated in ${worst
          .map(
            (s) =>
              `${s.label} (${pct(s.previousApprovalRate)} → ${pct(s.currentApprovalRate)} approval)`,
          )
          .join(" and ")}.`,
      );
    if (topReason && topReason.currentCount > topReason.previousCount)
      parts.push(
        `Rejections for "${topReason.label}" jumped from ${topReason.previousCount} to ${topReason.currentCount}, which points to an issuer/acquirer-side problem rather than lower demand.`,
      );
    explanation = parts.join(" ");
  }

  return {
    range,
    current,
    previous,
    volumeChange,
    approvalRateDeltaPp,
    isDrop,
    series,
    segments,
    reasons,
    headline,
    explanation,
  };
}

/** Chart window: the filter's date range, or the whole dataset. */
export function analyticsRangeFor(filters: { dateRange?: DateRange }): DateRange {
  return filters.dateRange ?? { from: DATA_START_DATE, to: DATA_END_DATE };
}
