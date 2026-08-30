import { describe, expect, it } from "vitest";
import { formatPosition } from "./SearchPerformanceColumns";

describe("formatPosition", () => {
  it("does not present missing position data as position zero", () => {
    expect(formatPosition(0)).toBe("—");
    expect(formatPosition(7.36)).toBe("7.4");
  });
});
