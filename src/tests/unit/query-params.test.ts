import { describe, it, expect } from "vitest";
import { parsePagination, parseIntParam } from "@/shared/utils/query-params";
describe("query-params", () => {
  describe("parsePagination", () => {
    it("returns defaults when no params are provided", () => {
      const sp = new URLSearchParams("");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
    it("parses valid page and pageSize", () => {
      const sp = new URLSearchParams("page=3&pageSize=25");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(3);
      expect(result.pageSize).toBe(25);
    });
    it("falls back to default on NaN input (not NaN-poisoning Prisma)", () => {
      const sp = new URLSearchParams("page=foo&pageSize=bar");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
    it("clamps page to min 1", () => {
      const sp = new URLSearchParams("page=0&pageSize=10");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(1);
    });
    it("clamps pageSize to maxPageSize (DoS protection)", () => {
      const sp = new URLSearchParams("page=1&pageSize=10000");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.pageSize).toBe(50);
    });
    it("clamps pageSize to min 1", () => {
      const sp = new URLSearchParams("page=1&pageSize=0");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.pageSize).toBe(1);
    });
    it("treats empty string the same as missing", () => {
      const sp = new URLSearchParams("page=&pageSize=");
      const result = parsePagination(sp, { pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });
    it("uses the default page when not specified", () => {
      const sp = new URLSearchParams("pageSize=20");
      const result = parsePagination(sp, { page: 5, pageSize: 10, maxPageSize: 50 });
      expect(result.page).toBe(5);
    });
  });
  describe("parseIntParam", () => {
    it("returns the fallback for null", () => {
      expect(parseIntParam(null, 7)).toBe(7);
    });
    it("returns the fallback for empty string", () => {
      expect(parseIntParam("", 7)).toBe(7);
    });
    it("parses a positive integer", () => {
      expect(parseIntParam("42", 0)).toBe(42);
    });
    it("returns the fallback for garbage", () => {
      expect(parseIntParam("not-a-number", 5)).toBe(5);
    });
    it("clamps to min", () => {
      expect(parseIntParam("0", 1, 1)).toBe(1);
    });
    it("clamps to max", () => {
      expect(parseIntParam("1000", 50, 1, 100)).toBe(100);
    });
  });
});
