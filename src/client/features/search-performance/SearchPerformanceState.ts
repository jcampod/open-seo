const SEARCH_CONSOLE_PROCESSING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

type SearchPerformanceTotals = {
  clicks: number;
  impressions: number;
};

export type SearchPerformanceEmptyKind = "processing" | "empty";

export function hasSearchPerformanceData(
  totals: SearchPerformanceTotals,
): boolean {
  return totals.clicks > 0 || totals.impressions > 0;
}

export function getSearchPerformanceEmptyKind(input: {
  connectedAt: string | null | undefined;
  checkedAt: number;
}): SearchPerformanceEmptyKind {
  if (!input.connectedAt || input.checkedAt <= 0) return "empty";

  const connectedAt = Date.parse(input.connectedAt);
  if (!Number.isFinite(connectedAt) || input.checkedAt < connectedAt) {
    return "empty";
  }

  return input.checkedAt - connectedAt <= SEARCH_CONSOLE_PROCESSING_WINDOW_MS
    ? "processing"
    : "empty";
}
