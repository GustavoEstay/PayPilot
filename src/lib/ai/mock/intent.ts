import { DATA_END_DATE, lastNDays } from "@/lib/payments/dates";
import type {
  DateRange,
  PaymentMethod,
  PaymentStatus,
  RejectionReason,
} from "@/lib/payments/types";

/**
 * Deterministic, keyword-based intent detection for the mock provider.
 * It stands in for the LLM's tool-selection step so the full tool-calling loop
 * (model -> tool call -> tool result -> model) runs without any API key.
 */
export type MockIntent =
  | { tool: "analyzeSalesDrop"; input: { range: "7d" | "14d" | "30d" } }
  | {
      tool: "filterPayments";
      input: {
        status?: PaymentStatus;
        reason?: RejectionReason;
        method?: PaymentMethod;
        dateRange?: DateRange;
      };
    }
  | { tool: "proposeRefund"; input: { paymentId: string; amount?: number; reason: string } }
  | { tool: null };

function parseRangeDays(text: string): number | undefined {
  const n = text.match(/last\s+(\d{1,2})\s+days?/);
  if (n) return Math.min(Math.max(Number(n[1]), 1), 60);
  if (/(last|past|this)\s+week|yesterday|recent/.test(text)) return 7;
  if (/(last|past)\s+(two|2)\s+weeks|fortnight/.test(text)) return 14;
  if (/(last|past|this)\s+month|30 days/.test(text)) return 30;
  return undefined;
}

function toSalesRange(days: number | undefined): "7d" | "14d" | "30d" {
  if (!days || days <= 10) return "7d";
  if (days <= 21) return "14d";
  return "30d";
}

const REASON_PATTERNS: [RegExp, RejectionReason][] = [
  [/insufficient|no funds|nsf/, "insufficient_funds"],
  [/issuer|unavailable|outage/, "issuer_unavailable"],
  [/fraud/, "fraud_suspected"],
  [/invalid|wrong card|card data/, "invalid_card_data"],
  [/expired/, "expired_card"],
  [/limit/, "limit_exceeded"],
];

const STATUS_PATTERNS: [RegExp, PaymentStatus][] = [
  [/reject|declin|fail/, "rejected"],
  [/refunded/, "refunded"],
  [/pending/, "pending"],
  [/approved|successful/, "approved"],
];

const METHOD_PATTERNS: [RegExp, PaymentMethod][] = [
  [/\bcards?\b|credit|debit/, "card"],
  [/transfer|bank/, "transfer"],
  [/wallet/, "wallet"],
];

const first = <T>(text: string, patterns: [RegExp, T][]): T | undefined =>
  patterns.find(([re]) => re.test(text))?.[1];

export function detectIntent(raw: string, end: string = DATA_END_DATE): MockIntent {
  const text = raw.toLowerCase();

  const paymentId = raw.match(/PAY-\d{4}/i)?.[0]?.toUpperCase();
  if (paymentId && /refund|reimburse|money back|chargeback/.test(text)) {
    const amountMatch = raw.match(/(?:\$|usd|brl|ars|r\$)\s?(\d+(?:[.,]\d{1,2})?)/i);
    const reasonMatch = raw.match(/\b(?:because|reason:?|since|due to)\s+(.+)$/i);
    return {
      tool: "proposeRefund",
      input: {
        paymentId,
        ...(amountMatch ? { amount: Number(amountMatch[1]!.replace(",", ".")) } : {}),
        reason: reasonMatch?.[1]?.trim().replace(/[.!]+$/, "") || "Requested via copilot",
      },
    };
  }

  const wantsTable = /^\s*(show|filter|list|find|display|only)\b/.test(text);
  const wantsAnalysis =
    /\b(drop|dropped|fell|fall|falling|dip|decrease|decreased)\b/.test(text) ||
    /why.*(sales|revenue|volume|approvals?)/.test(text);

  if (wantsAnalysis && !wantsTable) {
    return { tool: "analyzeSalesDrop", input: { range: toSalesRange(parseRangeDays(text)) } };
  }

  if (wantsTable || /payments?/.test(text)) {
    const days = parseRangeDays(text);
    const input = {
      status: first(text, STATUS_PATTERNS),
      reason: first(text, REASON_PATTERNS),
      method: first(text, METHOD_PATTERNS),
      dateRange: days ? lastNDays(days, end) : undefined,
    };
    const clean = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined),
    ) as Extract<MockIntent, { tool: "filterPayments" }>["input"];
    if (Object.keys(clean).length) return { tool: "filterPayments", input: clean };
  }

  return { tool: null };
}
