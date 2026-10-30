"use client";

import { useEffect } from "react";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { usePaymentsSummary } from "@/lib/payments/api-client";
import { DATA_END_DATE, DATA_START_DATE, formatDayShort } from "@/lib/payments/dates";
import { cn } from "@/lib/utils/cn";
import { useDashboardStore } from "@/stores/dashboard-store";
import { FilterBar } from "./filter-bar";
import { KpiCards } from "./kpi-cards";
import { PaymentsTable } from "./payments-table";
import { VolumeChart } from "./volume-chart";

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg aria-hidden viewBox="0 0 32 32" className="size-8">
        <rect width="32" height="32" rx="8" className="fill-brand-600" />
        <path d="M9 22 16 8l7 14-7-4-7 4Z" fill="#fff" />
      </svg>
      <span className="text-base font-semibold tracking-tight">PayPilot</span>
    </div>
  );
}

export function AppShell() {
  const filters = useDashboardStore((s) => s.filters);
  const copilotOpen = useDashboardStore((s) => s.copilotOpen);
  const setCopilotOpen = useDashboardStore((s) => s.setCopilotOpen);
  const { data: summary } = usePaymentsSummary(filters);

  // Start with the copilot closed on small screens, where it is an overlay.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setCopilotOpen(false);
  }, [setCopilotOpen]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3">
          <Logo />
          <Badge tone="warning" className="hidden sm:inline-flex">
            Simulated data
          </Badge>
        </div>
        <Button
          variant={copilotOpen ? "secondary" : "primary"}
          size="sm"
          onClick={() => setCopilotOpen(!copilotOpen)}
          aria-expanded={copilotOpen}
          aria-controls="copilot-panel"
        >
          <svg aria-hidden viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path d="M10 1.5a.75.75 0 0 1 .7.48l1.4 3.62 3.62 1.4a.75.75 0 0 1 0 1.4l-3.62 1.4-1.4 3.62a.75.75 0 0 1-1.4 0L7.9 9.8 4.28 8.4a.75.75 0 0 1 0-1.4L7.9 5.6 9.3 1.98A.75.75 0 0 1 10 1.5ZM15.5 13a.5.5 0 0 1 .47.33l.6 1.6 1.6.6a.5.5 0 0 1 0 .94l-1.6.6-.6 1.6a.5.5 0 0 1-.94 0l-.6-1.6-1.6-.6a.5.5 0 0 1 0-.94l1.6-.6.6-1.6A.5.5 0 0 1 15.5 13Z" />
          </svg>
          {copilotOpen ? "Hide copilot" : "Ask copilot"}
        </Button>
      </header>

      <div className="flex flex-1">
        <main
          id="main"
          className={cn(
            "mx-auto flex w-full min-w-0 flex-col gap-4 p-4 sm:p-6",
            copilotOpen ? "max-w-6xl" : "max-w-7xl",
          )}
        >
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Payments overview
            </h1>
            <p className="text-sm text-slate-500">
              {formatDayShort(DATA_START_DATE)} – {formatDayShort(DATA_END_DATE)}, 2026 · ARS, USD
              and BRL, reported in USD
            </p>
          </div>
          <KpiCards summary={summary} />
          <VolumeChart series={summary?.series} />
          <Card>
            <CardHeader>
              <CardTitle>Payments</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FilterBar />
              <PaymentsTable />
            </CardContent>
          </Card>
        </main>

        {copilotOpen && (
          <div
            aria-hidden
            className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
            onClick={() => setCopilotOpen(false)}
          />
        )}
        {/* Kept mounted while hidden so the conversation survives toggling. */}
        <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      </div>
    </div>
  );
}
