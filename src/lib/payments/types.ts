export const CURRENCIES = ["ARS", "USD", "BRL"] as const;
export const STATUSES = ["approved", "rejected", "refunded", "pending"] as const;
export const METHODS = ["card", "transfer", "wallet"] as const;
export const COUNTRIES = ["AR", "BR", "US"] as const;
export const REJECTION_REASONS = [
  "insufficient_funds",
  "issuer_unavailable",
  "fraud_suspected",
  "invalid_card_data",
  "expired_card",
  "limit_exceeded",
] as const;

export type Currency = (typeof CURRENCIES)[number];
export type PaymentStatus = (typeof STATUSES)[number];
export type PaymentMethod = (typeof METHODS)[number];
export type Country = (typeof COUNTRIES)[number];
export type RejectionReason = (typeof REJECTION_REASONS)[number];

export interface Payment {
  /** Human-readable id, e.g. PAY-0042 (chronological). */
  id: string;
  /** ISO-8601 timestamp (UTC). */
  createdAt: string;
  /** Amount in the payment currency, 2 decimals. */
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  method: PaymentMethod;
  rejectionReason: RejectionReason | null;
  merchant: string;
  country: Country;
  /** Amount already refunded, in the payment currency. */
  refundedAmount: number;
}

/** Inclusive date range, both ends as YYYY-MM-DD (UTC). */
export interface DateRange {
  from: string;
  to: string;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  reason?: RejectionReason;
  method?: PaymentMethod;
  currency?: Currency;
  country?: Country;
  dateRange?: DateRange;
  /** Free text search over id and merchant. */
  query?: string;
}

export interface PaymentsPage {
  items: Payment[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DailyPoint {
  date: string;
  approvedUsd: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface PaymentsSummary {
  totalCount: number;
  approvedUsd: number;
  approvalRate: number;
  refundedUsd: number;
  series: DailyPoint[];
}

export const REASON_LABELS: Record<RejectionReason, string> = {
  insufficient_funds: "Insufficient funds",
  issuer_unavailable: "Issuer unavailable",
  fraud_suspected: "Fraud suspected",
  invalid_card_data: "Invalid card data",
  expired_card: "Expired card",
  limit_exceeded: "Limit exceeded",
};

export const STATUS_LABELS: Record<PaymentStatus, string> = {
  approved: "Approved",
  rejected: "Rejected",
  refunded: "Refunded",
  pending: "Pending",
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Card",
  transfer: "Bank transfer",
  wallet: "Wallet",
};

export const COUNTRY_LABELS: Record<Country, string> = {
  AR: "Argentina",
  BR: "Brazil",
  US: "United States",
};
