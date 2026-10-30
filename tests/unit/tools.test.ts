import { beforeEach, describe, expect, it } from "vitest";
import { SUGGESTIONS } from "@/lib/ai/suggestions";
import { executeRefund, getPayment, getPayments, resetDb } from "@/lib/data/store";
import { runAnalyzeSalesDrop, runFilterPayments, runProposeRefund } from "@/lib/ai/tools";

beforeEach(() => resetDb());

describe("analyzeSalesDrop tool", () => {
  it("detects the simulated card issuer incident in the last 7 days", () => {
    const a = runAnalyzeSalesDrop({ range: "7d" });
    expect(a.isDrop).toBe(true);
    expect(a.volumeChange).toBeLessThan(-0.2);
    expect(a.approvalRateDeltaPp).toBeLessThan(-10);
    expect(a.series).toHaveLength(14);
    expect(a.series.filter((d) => d.period === "current")).toHaveLength(7);
    expect(a.reasons[0]?.reason).toBe("issuer_unavailable");
    expect(a.segments.slice(0, 2).map((s) => s.segment)).toEqual(expect.arrayContaining(["card"]));
    expect(a.headline).toMatch(/fell/);
  });

  it("supports longer windows", () => {
    expect(runAnalyzeSalesDrop({ range: "30d" }).series).toHaveLength(60);
  });
});

describe("filterPayments tool", () => {
  it("infers rejected status from a rejection reason and counts matches", () => {
    const out = runFilterPayments({ reason: "insufficient_funds", method: "card" });
    expect(out.filters).toEqual({
      status: "rejected",
      reason: "insufficient_funds",
      method: "card",
    });
    const expected = getPayments().filter(
      (p) =>
        p.status === "rejected" &&
        p.method === "card" &&
        p.rejectionReason === "insufficient_funds",
    ).length;
    expect(out.matchCount).toBe(expected);
  });
});

describe("proposeRefund tool (human-in-the-loop)", () => {
  it("returns a proposal for an approved payment without mutating anything", () => {
    const before = structuredClone(getPayment("PAY-0426"));
    const out = runProposeRefund({ paymentId: "pay-0426", reason: "Duplicate charge" });
    expect(out.status).toBe("awaiting_confirmation");
    if (out.status !== "awaiting_confirmation") return;
    expect(out.paymentId).toBe("PAY-0426");
    expect(out.amount).toBe(before?.amount);
    expect(out.isPartial).toBe(false);
    expect(getPayment("PAY-0426")).toEqual(before);
  });

  it("supports partial refunds and rejects amounts above the balance", () => {
    const partial = runProposeRefund({ paymentId: "PAY-0426", amount: 50, reason: "Partial" });
    expect(partial.status === "awaiting_confirmation" && partial.isPartial).toBe(true);
    const tooMuch = runProposeRefund({ paymentId: "PAY-0426", amount: 99_999, reason: "Nope" });
    expect(tooMuch.status).toBe("rejected");
  });

  it("rejects unknown and non-approved payments", () => {
    expect(runProposeRefund({ paymentId: "PAY-9999", reason: "Missing" }).status).toBe("rejected");
    const rejected = getPayments().find((p) => p.status === "rejected")!;
    expect(runProposeRefund({ paymentId: rejected.id, reason: "No" }).status).toBe("rejected");
  });

  it("only executeRefund (the confirmed endpoint) moves money, and only once", () => {
    const amount = getPayment("PAY-0426")!.amount;
    const first = executeRefund("PAY-0426", amount, "Duplicate charge");
    expect(first.ok).toBe(true);
    expect(getPayment("PAY-0426")?.status).toBe("refunded");
    expect(executeRefund("PAY-0426", amount, "Again").ok).toBe(false);
  });

  it("the demo refund suggestion targets a refundable payment", () => {
    const id = SUGGESTIONS[2].match(/PAY-\d{4}/)![0];
    expect(runProposeRefund({ paymentId: id, reason: "Demo" }).status).toBe(
      "awaiting_confirmation",
    );
  });
});
