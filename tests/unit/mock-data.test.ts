import { describe, expect, it } from "vitest";
import { DEFAULT_COUNT, createRng, generatePayments } from "@/lib/data/generate";
import { DATA_END_DATE, DATA_START_DATE, dayOf } from "@/lib/payments/dates";
import { CURRENCIES, METHODS, STATUSES } from "@/lib/payments/types";

describe("mock data generator", () => {
  const payments = generatePayments();

  it("is deterministic for a given seed", () => {
    expect(generatePayments()).toEqual(payments);
    expect(generatePayments(DEFAULT_COUNT, 1)).not.toEqual(payments);
  });

  it("produces ~500 chronologically ordered payments with unique ids", () => {
    expect(payments).toHaveLength(500);
    expect(new Set(payments.map((p) => p.id)).size).toBe(500);
    const sorted = [...payments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    expect(payments).toEqual(sorted);
    expect(payments[0]!.id).toBe("PAY-0001");
  });

  it("keeps every payment inside the dataset window", () => {
    for (const p of payments) {
      expect(dayOf(p.createdAt) >= DATA_START_DATE).toBe(true);
      expect(dayOf(p.createdAt) <= DATA_END_DATE).toBe(true);
    }
  });

  it("covers all currencies, statuses and methods", () => {
    expect(new Set(payments.map((p) => p.currency))).toEqual(new Set(CURRENCIES));
    expect(new Set(payments.map((p) => p.status))).toEqual(new Set(STATUSES));
    expect(new Set(payments.map((p) => p.method))).toEqual(new Set(METHODS));
  });

  it("sets a rejection reason only on rejected payments", () => {
    for (const p of payments) {
      expect(p.rejectionReason !== null).toBe(p.status === "rejected");
    }
  });

  it("keeps refunded amounts consistent with status", () => {
    for (const p of payments) {
      if (p.status === "refunded") expect(p.refundedAmount).toBe(p.amount);
      else expect(p.refundedAmount).toBe(0);
    }
  });

  it("matches country and currency plausibly", () => {
    for (const p of payments.filter((x) => x.country === "US")) expect(p.currency).toBe("USD");
  });

  it("seeded rng yields values in [0, 1)", () => {
    const rng = createRng(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
