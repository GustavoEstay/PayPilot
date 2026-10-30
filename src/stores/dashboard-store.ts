import { create } from "zustand";
import { normalizeFilters } from "@/lib/payments/filters";
import type { PaymentFilters } from "@/lib/payments/types";

export type FilterSource = "user" | "copilot";

interface DashboardState {
  filters: PaymentFilters;
  filterSource: FilterSource | null;
  page: number;
  copilotOpen: boolean;
  /** Tool calls whose side effects were already applied (guards re-renders / strict mode). */
  appliedToolCalls: Record<string, true>;

  setFilters: (filters: PaymentFilters, source?: FilterSource) => void;
  patchFilters: (patch: Partial<PaymentFilters>) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  setCopilotOpen: (open: boolean) => void;
  applyCopilotFilters: (toolCallId: string, filters: PaymentFilters) => void;
}

export const useDashboardStore = create<DashboardState>()((set, get) => ({
  filters: {},
  filterSource: null,
  page: 1,
  copilotOpen: true,
  appliedToolCalls: {},

  setFilters: (filters, source = "user") =>
    set({ filters: normalizeFilters(filters), filterSource: source, page: 1 }),
  patchFilters: (patch) =>
    set((s) => ({
      filters: normalizeFilters({ ...s.filters, ...patch }),
      filterSource: "user",
      page: 1,
    })),
  resetFilters: () => set({ filters: {}, filterSource: null, page: 1 }),
  setPage: (page) => set({ page: Math.max(1, page) }),
  setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
  applyCopilotFilters: (toolCallId, filters) => {
    if (get().appliedToolCalls[toolCallId]) return;
    set((s) => ({
      filters: normalizeFilters(filters),
      filterSource: "copilot",
      page: 1,
      appliedToolCalls: { ...s.appliedToolCalls, [toolCallId]: true },
    }));
  },
}));
