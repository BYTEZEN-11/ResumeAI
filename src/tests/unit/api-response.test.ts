import { describe, it, expect } from "vitest";
import { successResponse, errorResponse, notFoundResponse, unauthorizedResponse } from "@/shared/utils/api-response";
describe("successResponse", () => {
  it("returns 200 with success=true", async () => {
    const res = successResponse({ id: "1" }, "OK");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe("OK");
    expect(body.data).toEqual({ id: "1" });
  });
  it("accepts custom status code", async () => {
    const res = successResponse(null, "Created", undefined, 201);
    expect(res.status).toBe(201);
  });
  it("includes meta when provided", async () => {
    const meta = { page: 1, pageSize: 10, total: 100, totalPages: 10, hasNextPage: true, hasPrevPage: false };
    const res = successResponse([], "OK", meta);
    const body = await res.json();
    expect(body.meta).toEqual(meta);
  });
});
describe("errorResponse", () => {
  it("returns 400 with success=false", async () => {
    const res = errorResponse("Bad request");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.message).toBe("Bad request");
  });
});
describe("notFoundResponse", () => {
  it("returns 404 with resource name", async () => {
    const res = notFoundResponse("Resume");
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toContain("Resume");
  });
});
describe("unauthorizedResponse", () => {
  it("returns 401", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
