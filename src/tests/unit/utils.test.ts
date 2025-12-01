import { describe, it, expect } from "vitest";
import {
  formatBytes,
  formatDate,
  slugify,
  truncate,
  scoreToGrade,
  scoreToColor,
  parseError,
} from "@/lib/utils";
describe("formatBytes", () => {
  it("returns '0 Bytes' for 0", () => {
    expect(formatBytes(0)).toBe("0 Bytes");
  });
  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });
  it("formats megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });
  it("respects decimal places", () => {
    expect(formatBytes(1500, 1)).toBe("1.5 KB");
  });
});
describe("formatDate", () => {
  it("returns — for null", () => {
    expect(formatDate(null)).toBe("—");
  });
  it("formats a valid date", () => {
    const result = formatDate(new Date("2024-01-15"));
    expect(result).toContain("Jan");
    expect(result).toContain("2024");
  });
});
describe("slugify", () => {
  it("converts to lowercase with hyphens", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });
  it("removes special characters", () => {
    expect(slugify("Senior @ Engineer!")).toBe("senior-engineer");
  });
  it("collapses multiple hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });
});
describe("truncate", () => {
  it("returns full string if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });
  it("truncates with ellipsis when over limit", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });
});
describe("scoreToGrade", () => {
  it("returns A+ for 95", () => {
    expect(scoreToGrade(95)).toBe("A+");
  });
  it("returns F for 30", () => {
    expect(scoreToGrade(30)).toBe("F");
  });
  it("returns B for 75", () => {
    expect(scoreToGrade(75)).toBe("B");
  });
});
describe("scoreToColor", () => {
  it("returns green for 80+", () => {
    expect(scoreToColor(85)).toContain("green");
  });
  it("returns red for < 40", () => {
    expect(scoreToColor(30)).toContain("red");
  });
});
describe("parseError", () => {
  it("extracts message from Error", () => {
    expect(parseError(new Error("test error"))).toBe("test error");
  });
  it("returns string as-is", () => {
    expect(parseError("some error")).toBe("some error");
  });
  it("returns fallback for unknown", () => {
    expect(parseError({ code: 42 })).toBe("An unexpected error occurred");
  });
});
