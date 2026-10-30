"use client";

import { Badge, Button, Input, Select } from "@/components/ui";
import { DATA_END_DATE, DATA_START_DATE } from "@/lib/payments/dates";
import { countActiveFilters } from "@/lib/payments/filters";
import {
  COUNTRIES,
  COUNTRY_LABELS,
  METHODS,
  METHOD_LABELS,
  REASON_LABELS,
  REJECTION_REASONS,
  STATUSES,
  STATUS_LABELS,
  type Country,
  type PaymentMethod,
  type PaymentStatus,
  type RejectionReason,
} from "@/lib/payments/types";
import { useDashboardStore } from "@/stores/dashboard-store";

const opts = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((v) => ({ value: v, label: labels[v] }));

export function FilterBar() {
  const filters = useDashboardStore((s) => s.filters);
  const source = useDashboardStore((s) => s.filterSource);
  const patch = useDashboardStore((s) => s.patchFilters);
  const reset = useDashboardStore((s) => s.resetFilters);
  const active = countActiveFilters(filters);

  const setRange = (key: "from" | "to", value: string) => {
    const from = key === "from" ? value : (filters.dateRange?.from ?? DATA_START_DATE);
    const to = key === "to" ? value : (filters.dateRange?.to ?? DATA_END_DATE);
    patch({ dateRange: value && from <= to ? { from, to } : undefined });
  };

  return (
    <div role="search" aria-label="Filter payments" className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-7">
        <Input
          label="Search"
          placeholder="ID or merchant"
          value={filters.query ?? ""}
          onChange={(e) => patch({ query: e.target.value })}
          className="col-span-2 sm:col-span-1"
        />
        <Select
          label="Status"
          placeholder="All statuses"
          options={opts(STATUSES, STATUS_LABELS)}
          value={filters.status ?? ""}
          onChange={(e) => patch({ status: (e.target.value || undefined) as PaymentStatus })}
        />
        <Select
          label="Rejection reason"
          placeholder="All reasons"
          options={opts(REJECTION_REASONS, REASON_LABELS)}
          value={filters.reason ?? ""}
          onChange={(e) => patch({ reason: (e.target.value || undefined) as RejectionReason })}
        />
        <Select
          label="Method"
          placeholder="All methods"
          options={opts(METHODS, METHOD_LABELS)}
          value={filters.method ?? ""}
          onChange={(e) => patch({ method: (e.target.value || undefined) as PaymentMethod })}
        />
        <Select
          label="Country"
          placeholder="All countries"
          options={opts(COUNTRIES, COUNTRY_LABELS)}
          value={filters.country ?? ""}
          onChange={(e) => patch({ country: (e.target.value || undefined) as Country })}
        />
        <Input
          label="From"
          type="date"
          min={DATA_START_DATE}
          max={DATA_END_DATE}
          value={filters.dateRange?.from ?? ""}
          onChange={(e) => setRange("from", e.target.value)}
        />
        <Input
          label="To"
          type="date"
          min={DATA_START_DATE}
          max={DATA_END_DATE}
          value={filters.dateRange?.to ?? ""}
          onChange={(e) => setRange("to", e.target.value)}
        />
      </div>
      <div className="flex min-h-8 flex-wrap items-center gap-2" aria-live="polite">
        <span className="text-xs text-slate-500">
          {active ? `${active} filter${active > 1 ? "s" : ""} active` : "No filters"}
        </span>
        {source === "copilot" && active > 0 && (
          <Badge tone="brand" data-testid="copilot-filter-badge">
            Applied by Copilot
          </Badge>
        )}
        {active > 0 && (
          <Button variant="ghost" size="sm" onClick={reset}>
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
