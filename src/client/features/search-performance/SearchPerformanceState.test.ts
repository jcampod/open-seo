import { describe, expect, it } from "vitest";
import {
  getSearchPerformanceEmptyKind,
  hasSearchPerformanceData,
} from "./SearchPerformanceState";

describe("search performance empty state", () => {
  it("treats a report with no clicks or impressions as empty", () => {
    expect(hasSearchPerformanceData({ clicks: 0, impressions: 0 })).toBe(false);
    expect(hasSearchPerformanceData({ clicks: 1, impressions: 0 })).toBe(true);
    expect(hasSearchPerformanceData({ clicks: 0, impressions: 1 })).toBe(true);
  });

  it("identifies a newly connected property as processing", () => {
    expect(
      getSearchPerformanceEmptyKind({
        connectedAt: "2026-08-30T08:00:00.000Z",
        checkedAt: Date.parse("2026-09-02T08:00:00.000Z"),
      }),
    ).toBe("processing");
  });

  it("uses the generic empty state after the processing window", () => {
    expect(
      getSearchPerformanceEmptyKind({
        connectedAt: "2026-08-20T08:00:00.000Z",
        checkedAt: Date.parse("2026-08-30T08:00:00.000Z"),
      }),
    ).toBe("empty");
  });
});
