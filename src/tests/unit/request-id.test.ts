import { describe, it, expect } from "vitest";
import { formatLogWithRequestId } from "@/shared/utils/request-id";
describe("Request ID Utilities", () => {
  it("should format log messages with request ID", () => {
    const requestId = "abc123def456";
    const message = "User login attempt";
    const formatted = formatLogWithRequestId(requestId, message);
    expect(formatted).toContain("[req:");
    expect(formatted).toContain(requestId.slice(0, 8));
    expect(formatted).toContain(message);
    expect(formatted).toBe(`[req:${requestId.slice(0, 8)}] ${message}`);
  });
  it("should truncate long request IDs to 8 characters", () => {
    const longRequestId = "abc123def456ghi789jkl012mno345pqr678";
    const message = "Test message";
    const formatted = formatLogWithRequestId(longRequestId, message);
    const extractedId = formatted.match(/\[req:([^\]]+)\]/)?.[1];
    expect(extractedId).toBeDefined();
    expect(extractedId?.length).toBe(8);
    expect(extractedId).toBe(longRequestId.slice(0, 8));
  });
  it("should handle short request IDs", () => {
    const shortRequestId = "abc";
    const message = "Test";
    const formatted = formatLogWithRequestId(shortRequestId, message);
    expect(formatted).toContain("[req:abc]");
  });
});
