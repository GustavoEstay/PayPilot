import { describe, expect, it } from "vitest";
import { generatePayments } from "@/lib/data/generate";
import {
  applyFilters,
  countActiveFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  normalizeFilters,
} from "@/lib/payments/filters";
import { dayOf, lastNDays } from "@/lib/payments/dates";
import type { PaymentFilters } from "@/lib/payments/types";

const payments = generatePayments();

describe("applyFilters", () => {
  it("returns everything with no filters", () => {
    expect(applyFilters(payments, {})).toHaveLength(payments.length);
  });

  it("combines status, method and reason with AND semantics", () => {
    const result = applyFilters(payments, {
      status: "rejected",
      method: "card",
      reason: "issuer_unavailable",
    });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.status).toBe("rejected");
      expect(p.method).toBe("card");
      expect(p.rejectionReason).toBe("issuer_unavailable");
    }
  });

  it("filters by inclusive date range", () => {
    const range = lastNDays(7);
    const result = applyFilters(payments, { dateRange: range });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(dayOf(p.createdAt) >= range.from && dayOf(p.createdAt) <= range.to).toBe(true);
    }
  });

  it("searches id and merchant case-insensitively", () => {
    expect(applyFilters(payments, { query: "pay-0426" }).map((p) => p.id)).toEqual(["PAY-0426"]);
    const byMerchant = applyFilters(payments, { query: "brooklyn" });
    expect(byMerchant.length).toBeGreaterThan(0);
    expect(byMerchant.every((p) => p.merchant === "Brooklyn Audio")).toBe(true);
  });
});

describe("filter serialization", () => {
  it("round-trips through URL search params", () => {
    const filters: PaymentFilters = {
      status: "rejected",
      reason: "insufficient_funds",
      method: "card",
      currency: "BRL",
      country: "BR",
      dateRange: { from: "2026-10-01", to: "2026-10-29" },
      query: "Rio",
    };
    expect(filtersFromSearchParams(filtersToSearchParams(filters))).toEqual(filters);
  });

  it("drops invalid or malicious params", () => {
    const params = new URLSearchParams({
      status: "hacked",
      method: "card",
      from: "2026-10-29",
      to: "2026-10-01", // inverted range
    });
    expect(filtersFromSearchParams(params)).toEqual({ method: "card" });
  });

  it("normalizes empty values and counts active filters", () => {
    const f = normalizeFilters({ status: undefined, query: "  ", method: "wallet" });
    expect(f).toEqual({ method: "wallet" });
    expect(countActiveFilters(f)).toBe(1);
  });
});
