import { DATA_DAYS, DATA_END_DATE, addDays, parseDay } from "@/lib/payments/dates";
import { round2 } from "@/lib/payments/money";
import type {
  Country,
  Currency,
  Payment,
  PaymentMethod,
  PaymentStatus,
  RejectionReason,
} from "@/lib/payments/types";

export const DEFAULT_SEED = 20261029;
export const DEFAULT_COUNT = 500;

/**
 * The simulated incident: during the last INCIDENT_DAYS days a card issuer outage
 * hits approval rates, worst in Brazil. The copilot's analyzeSalesDrop tool should find it.
 */
export const INCIDENT_DAYS = 7;

/** Small, fast, seedable PRNG (mulberry32). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T extends string>(rng: () => number, weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of entries) {
    r -= w;
    if (r <= 0) return value;
  }
  return entries[entries.length - 1]![0];
}

const MERCHANTS: Record<Country, string[]> = {
  AR: ["Andes Coffee Co.", "Pampa Outdoors", "Tango Tickets", "Patagonia Books"],
  BR: ["Rio Digital Store", "Sampa Sneakers", "Amazonia Market"],
  US: ["Brooklyn Audio", "Golden Gate Games", "Lone Star Supplies"],
};

/** Typical ticket ranges per currency (min, max). */
const AMOUNT_RANGE: Record<Currency, [number, number]> = {
  USD: [8, 450],
  BRL: [40, 2200],
  ARS: [9_000, 520_000],
};

function amountFor(rng: () => number, currency: Currency): number {
  const [min, max] = AMOUNT_RANGE[currency];
  // Skewed towards smaller tickets, like real checkout data.
  const skew = Math.pow(rng(), 2.2);
  return round2(min + (max - min) * skew);
}

function currencyFor(rng: () => number, country: Country): Currency {
  if (country === "US") return "USD";
  if (country === "BR") return rng() < 0.92 ? "BRL" : "USD";
  return rng() < 0.88 ? "ARS" : "USD";
}

const CARD_REASONS: Record<RejectionReason, number> = {
  insufficient_funds: 40,
  issuer_unavailable: 6,
  fraud_suspected: 14,
  invalid_card_data: 18,
  expired_card: 12,
  limit_exceeded: 10,
};

const INCIDENT_CARD_REASONS: Record<RejectionReason, number> = {
  ...CARD_REASONS,
  issuer_unavailable: 160,
};

const NON_CARD_REASONS: Partial<Record<RejectionReason, number>> = {
  insufficient_funds: 55,
  fraud_suspected: 20,
  limit_exceeded: 25,
};

export function generatePayments(
  count: number = DEFAULT_COUNT,
  seed: number = DEFAULT_SEED,
): Payment[] {
  const rng = createRng(seed);
  const incidentStart = addDays(DATA_END_DATE, -(INCIDENT_DAYS - 1));
  const startMs = parseDay(addDays(DATA_END_DATE, -(DATA_DAYS - 1)));

  const drafts: Omit<Payment, "id">[] = [];
  for (let i = 0; i < count; i++) {
    const dayOffset = Math.floor(rng() * DATA_DAYS);
    const secondOfDay = Math.floor(rng() * 86_400);
    const createdMs = startMs + dayOffset * 86_400_000 + secondOfDay * 1000;
    const createdAt = new Date(createdMs).toISOString();
    const day = createdAt.slice(0, 10);
    const inIncident = day >= incidentStart;

    const country = pickWeighted<Country>(rng, { AR: 40, BR: 35, US: 25 });
    const currency = currencyFor(rng, country);
    const method = pickWeighted<PaymentMethod>(rng, { card: 58, transfer: 22, wallet: 20 });
    const merchants = MERCHANTS[country];
    const merchant = merchants[Math.floor(rng() * merchants.length)]!;
    const amount = amountFor(rng, currency);

    let approveProbability = method === "card" ? 0.8 : 0.86;
    if (inIncident && method === "card") approveProbability = country === "BR" ? 0.18 : 0.42;

    let status: PaymentStatus;
    let rejectionReason: RejectionReason | null = null;
    let refundedAmount = 0;
    const roll = rng();
    if (roll < 0.04) {
      status = "pending";
    } else if (rng() < approveProbability) {
      status = "approved";
      if (!inIncident && rng() < 0.05) {
        status = "refunded";
        refundedAmount = amount;
      }
    } else {
      status = "rejected";
      const weights =
        method === "card"
          ? inIncident
            ? INCIDENT_CARD_REASONS
            : CARD_REASONS
          : (NON_CARD_REASONS as Record<RejectionReason, number>);
      rejectionReason = pickWeighted<RejectionReason>(rng, weights);
    }

    drafts.push({
      createdAt,
      amount,
      currency,
      status,
      method,
      rejectionReason,
      merchant,
      country,
      refundedAmount,
    });
  }

  drafts.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return drafts.map((p, i) => ({ id: `PAY-${String(i + 1).padStart(4, "0")}`, ...p }));
}
