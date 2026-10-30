"use client";

import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { filtersToSearchParams } from "./filters";
import type { Payment, PaymentFilters, PaymentsPage, PaymentsSummary } from "./types";

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const paymentKeys = {
  all: ["payments"] as const,
  list: (filters: PaymentFilters, page: number) => ["payments", "list", filters, page] as const,
  summary: (filters: PaymentFilters) => ["payments", "summary", filters] as const,
};

export const PAGE_SIZE = 12;

export function usePayments(filters: PaymentFilters, page: number) {
  return useQuery({
    queryKey: paymentKeys.list(filters, page),
    queryFn: () => {
      const params = filtersToSearchParams(filters);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      return getJson<PaymentsPage>(`/api/payments?${params}`);
    },
    placeholderData: keepPreviousData,
  });
}

export function usePaymentsSummary(filters: PaymentFilters) {
  return useQuery({
    queryKey: paymentKeys.summary(filters),
    queryFn: () =>
      getJson<PaymentsSummary>(`/api/payments/summary?${filtersToSearchParams(filters)}`),
    placeholderData: keepPreviousData,
  });
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
  proposalId: string;
}

export interface RefundResponse {
  refund: { refundId: string; paymentId: string; amount: number };
  payment: Payment;
}

export function useConfirmRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ paymentId, ...body }: RefundRequest) => {
      const res = await fetch(`/api/payments/${encodeURIComponent(paymentId)}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as RefundResponse | { error: string };
      if (!res.ok || "error" in json)
        throw new Error("error" in json ? json.error : "Refund failed");
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paymentKeys.all }),
  });
}
