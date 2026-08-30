import { Link } from "@tanstack/react-router";
import {
  Clock3,
  ExternalLink,
  Loader2,
  RefreshCw,
  SearchX,
} from "lucide-react";
import type { SearchPerformanceEmptyKind } from "@/client/features/search-performance/SearchPerformanceState";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "—";
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(timestamp) ? dateTimeFormat.format(timestamp) : "—";
}

export function SearchPerformanceEmptyState({
  projectId,
  kind,
  siteUrl,
  connectedAt,
  checkedAt,
  rangeLabel,
  isRefreshing,
  onRefresh,
  onTryLongerRange,
}: {
  projectId: string;
  kind: SearchPerformanceEmptyKind;
  siteUrl: string | null | undefined;
  connectedAt: string | null | undefined;
  checkedAt: number;
  rangeLabel: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onTryLongerRange?: () => void;
}) {
  const processing = kind === "processing";
  const Icon = processing ? Clock3 : SearchX;

  return (
    <div className="rounded-xl border border-base-300 bg-base-100 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">
            {processing
              ? "Search Console is processing your data"
              : "No search performance data yet"}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-base-content/70">
            {processing
              ? "The property is connected correctly. New Search Console properties can take a few days, and sometimes up to a week, before performance data becomes available."
              : `Google returned no clicks or impressions for ${rangeLabel.toLowerCase()}. It may still be processing the property, or the site may not have search activity in this period.`}
          </p>

          <dl className="mt-5 grid gap-3 rounded-lg bg-base-200/60 p-4 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-base-content/50">
                Property
              </dt>
              <dd className="mt-1 truncate font-mono" title={siteUrl ?? ""}>
                {siteUrl ?? "Connected property"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-base-content/50">
                Connected
              </dt>
              <dd className="mt-1">{formatTimestamp(connectedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-base-content/50">
                Last checked
              </dt>
              <dd className="mt-1">{formatTimestamp(checkedAt)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm gap-2"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RefreshCw className="size-4" aria-hidden="true" />
              )}
              Check again
            </button>
            {!processing && onTryLongerRange ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={onTryLongerRange}
              >
                Try last 3 months
              </button>
            ) : null}
            <Link
              to="/p/$projectId/settings/integrations"
              params={{ projectId }}
              className="btn btn-ghost btn-sm"
            >
              Change property
            </Link>
            <a
              href="https://support.google.com/webmasters/answer/96568"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm gap-1"
            >
              About Search Console data
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
