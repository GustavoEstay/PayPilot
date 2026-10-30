import { getPayments } from "@/lib/data/store";
import { analyticsRangeFor, summarize } from "@/lib/payments/analytics";
import { applyFilters, filtersFromSearchParams } from "@/lib/payments/filters";

export const dynamic = "force-dynamic";

/** KPIs + daily series for the current filters (the chart and cards follow the table). */
export function GET(req: Request) {
  const filters = filtersFromSearchParams(new URL(req.url).searchParams);
  const filtered = applyFilters(getPayments(), filters);
  return Response.json(summarize(filtered, analyticsRangeFor(filters)));
}
