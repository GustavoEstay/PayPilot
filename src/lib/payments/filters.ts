import { z } from "zod";
import { dayOf, inRange, isDay } from "./dates";
import {
  COUNTRIES,
  CURRENCIES,
  METHODS,
  REJECTION_REASONS,
  STATUSES,
  type Payment,
  type PaymentFilters,
} from "./types";

export const dayString = z.string().refine(isDay, "Expected a YYYY-MM-DD date");

export const dateRangeSchema = z
  .object({ from: dayString, to: dayString })
  .refine((r) => r.from <= r.to, "`from` must be on or before `to`");

export const filtersSchema = z.object({
  status: z.enum(STATUSES).optional(),
  reason: z.enum(REJECTION_REASONS).optional(),
  method: z.enum(METHODS).optional(),
  currency: z.enum(CURRENCIES).optional(),
  country: z.enum(COUNTRIES).optional(),
  dateRange: dateRangeSchema.optional(),
  query: z.string().trim().max(80).optional(),
});

export function applyFilters(payments: readonly Payment[], filters: PaymentFilters): Payment[] {
  const q = filters.query?.trim().toLowerCase();
  return payments.filter((p) => {
    if (filters.status && p.status !== filters.status) return false;
    if (filters.reason && p.rejectionReason !== filters.reason) return false;
    if (filters.method && p.method !== filters.method) return false;
    if (filters.currency && p.currency !== filters.currency) return false;
    if (filters.country && p.country !== filters.country) return false;
    if (filters.dateRange && !inRange(dayOf(p.createdAt), filters.dateRange)) return false;
    if (q && !p.id.toLowerCase().includes(q) && !p.merchant.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Removes empty values so filters compare and serialize cleanly. */
export function normalizeFilters(filters: PaymentFilters): PaymentFilters {
  const out: PaymentFilters = {};
  if (filters.status) out.status = filters.status;
  if (filters.reason) out.reason = filters.reason;
  if (filters.method) out.method = filters.method;
  if (filters.currency) out.currency = filters.currency;
  if (filters.country) out.country = filters.country;
  if (filters.dateRange) out.dateRange = { ...filters.dateRange };
  if (filters.query?.trim()) out.query = filters.query.trim();
  return out;
}

export function countActiveFilters(filters: PaymentFilters): number {
  return Object.keys(normalizeFilters(filters)).length;
}

export function filtersToSearchParams(filters: PaymentFilters): URLSearchParams {
  const f = normalizeFilters(filters);
  const params = new URLSearchParams();
  if (f.status) params.set("status", f.status);
  if (f.reason) params.set("reason", f.reason);
  if (f.method) params.set("method", f.method);
  if (f.currency) params.set("currency", f.currency);
  if (f.country) params.set("country", f.country);
  if (f.dateRange) {
    params.set("from", f.dateRange.from);
    params.set("to", f.dateRange.to);
  }
  if (f.query) params.set("q", f.query);
  return params;
}

/** Parses untrusted query params; invalid values are dropped rather than failing the request. */
export function filtersFromSearchParams(params: URLSearchParams): PaymentFilters {
  const pick = <T extends readonly string[]>(key: string, allowed: T): T[number] | undefined => {
    const v = params.get(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T[number]) : undefined;
  };
  const from = params.get("from");
  const to = params.get("to");
  const range = from && to ? dateRangeSchema.safeParse({ from, to }) : undefined;
  return normalizeFilters({
    status: pick("status", STATUSES),
    reason: pick("reason", REJECTION_REASONS),
    method: pick("method", METHODS),
    currency: pick("currency", CURRENCIES),
    country: pick("country", COUNTRIES),
    dateRange: range?.success ? range.data : undefined,
    query: params.get("q")?.slice(0, 80) ?? undefined,
  });
}
