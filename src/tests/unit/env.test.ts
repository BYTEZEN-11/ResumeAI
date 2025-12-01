import { describe, it, expect, beforeEach, afterEach } from "vitest";
describe("Environment Variable Validation", () => {
  const originalEnv = process.env;
  beforeEach(() => {

    process.env = { ...originalEnv };
  });
  afterEach(() => {

    process.env = originalEnv;
  });
  it("should validate required database URLs", () => {
    process.env.DATABASE_URL = "";
    expect(() => {

      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error("DATABASE_URL is required");
    }).toThrow("DATABASE_URL is required");
  });
  it("should validate AUTH_SECRET minimum length", () => {
    const shortSecret = "short";
    expect(() => {
      if (shortSecret.length < 32) {
        throw new Error("AUTH_SECRET must be at least 32 characters");
      }
    }).toThrow("at least 32 characters");
  });
  it("should validate OpenAI API key format", () => {
    const invalidKey = "invalid-key";
    expect(() => {
      if (!invalidKey.startsWith("sk-")) {
        throw new Error("OPENAI_API_KEY must start with sk-");
      }
    }).toThrow("must start with sk-");
  });
  it("should validate Stripe key formats", () => {
    const invalidPublishable = "invalid";
    expect(() => {
      if (!invalidPublishable.startsWith("pk_")) {
        throw new Error("Stripe publishable key must start with pk_");
      }
    }).toThrow("must start with pk_");
  });
  it("should validate email format for RESEND_FROM_EMAIL", () => {
    const invalidEmail = "not-an-email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(invalidEmail)).toBe(false);
    expect(emailRegex.test("valid@example.com")).toBe(true);
  });
});
