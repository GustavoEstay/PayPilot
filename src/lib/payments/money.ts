import type { Currency } from "./types";

/** Fixed, illustrative FX rates (USD per 1 unit). Simulated data only. */
export const USD_PER_UNIT: Record<Currency, number> = {
  USD: 1,
  BRL: 0.18,
  ARS: 1 / 1350,
};

export function toUsd(amount: number, currency: Currency): number {
  return amount * USD_PER_UNIT[currency];
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const formatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency: Currency | "USD" = "USD"): string {
  const key = currency;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "ARS" ? 0 : 2,
    });
    formatters.set(key, fmt);
  }
  return fmt.format(amount);
}

export function formatCompactUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`;
}
