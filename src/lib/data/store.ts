import { generatePayments } from "./generate";
import { round2 } from "@/lib/payments/money";
import type { Payment } from "@/lib/payments/types";

/**
 * In-memory "database" for the mock backend. Stored on globalThis so every route
 * handler (and dev-mode hot reloads) share one instance. Resets on server restart.
 */
interface PaymentsDb {
  payments: Payment[];
  byId: Map<string, Payment>;
  refunds: RefundRecord[];
}

export interface RefundRecord {
  refundId: string;
  paymentId: string;
  amount: number;
  reason: string;
  createdAt: string;
}

const globalForDb = globalThis as unknown as { __paypilotDb?: PaymentsDb };

function createDb(): PaymentsDb {
  const payments = generatePayments();
  return { payments, byId: new Map(payments.map((p) => [p.id, p])), refunds: [] };
}

export function getDb(): PaymentsDb {
  globalForDb.__paypilotDb ??= createDb();
  return globalForDb.__paypilotDb;
}

/** Test helper. */
export function resetDb(): void {
  globalForDb.__paypilotDb = createDb();
}

export function getPayments(): Payment[] {
  return getDb().payments;
}

export function getPayment(id: string): Payment | undefined {
  return getDb().byId.get(id.toUpperCase());
}

export type RefundCheck =
  { ok: true; payment: Payment; amount: number; refundable: number } | { ok: false; error: string };

/** Pure validation shared by the copilot (proposal) and the refund endpoint (execution). */
export function checkRefund(payment: Payment | undefined, amount?: number): RefundCheck {
  if (!payment) return { ok: false, error: "Payment not found." };
  if (payment.status !== "approved")
    return {
      ok: false,
      error: `Payment ${payment.id} is ${payment.status}; only approved payments can be refunded.`,
    };
  const refundable = round2(payment.amount - payment.refundedAmount);
  const requested = round2(amount ?? refundable);
  if (!(requested > 0)) return { ok: false, error: "Refund amount must be greater than zero." };
  if (requested > refundable)
    return {
      ok: false,
      error: `Refund amount exceeds the refundable balance (${refundable} ${payment.currency}).`,
    };
  return { ok: true, payment, amount: requested, refundable };
}

/** Executes a refund. Only called from the human-confirmed REST endpoint, never by the model. */
export function executeRefund(
  paymentId: string,
  amount: number,
  reason: string,
): { ok: true; refund: RefundRecord; payment: Payment } | { ok: false; error: string } {
  const db = getDb();
  const payment = getPayment(paymentId);
  const check = checkRefund(payment, amount);
  if (!check.ok) return check;

  const updated: Payment = {
    ...check.payment,
    refundedAmount: round2(check.payment.refundedAmount + check.amount),
  };
  if (updated.refundedAmount >= updated.amount) updated.status = "refunded";

  db.byId.set(updated.id, updated);
  const idx = db.payments.findIndex((p) => p.id === updated.id);
  db.payments[idx] = updated;

  const refund: RefundRecord = {
    refundId: `RF-${String(db.refunds.length + 1).padStart(4, "0")}`,
    paymentId: updated.id,
    amount: check.amount,
    reason,
    createdAt: new Date().toISOString(),
  };
  db.refunds.push(refund);
  return { ok: true, refund, payment: updated };
}
