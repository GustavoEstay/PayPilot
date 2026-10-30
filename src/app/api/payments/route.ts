import { getPayments } from "@/lib/data/store";
import { applyFilters, filtersFromSearchParams } from "@/lib/payments/filters";
import type { PaymentsPage } from "@/lib/payments/types";

export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;

export function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const filters = filtersFromSearchParams(params);
  const pageSize = Math.min(Math.max(Number(params.get("pageSize")) || 20, 1), MAX_PAGE_SIZE);
  const page = Math.max(Number(params.get("page")) || 1, 1);

  // Newest first.
  const matches = applyFilters(getPayments(), filters).toReversed();
  const body: PaymentsPage = {
    items: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length,
    page,
    pageSize,
  };
  return Response.json(body);
}
