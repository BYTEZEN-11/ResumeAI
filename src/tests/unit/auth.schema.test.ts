import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@/modules/auth/schemas/auth.schema";
describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "password123" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ email: "not-an-email", password: "password123" });
    expect(result.success).toBe(false);
  });
  it("rejects short password", () => {
    const result = loginSchema.safeParse({ email: "user@test.com", password: "short" });
    expect(result.success).toBe(false);
  });
});
describe("registerSchema", () => {
  const valid = {
    name: "John Doe",
    email: "john@test.com",
    password: "Password1!",
    confirmPassword: "Password1!",
  };
  it("accepts valid registration", () => {
    const result = registerSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });
  it("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({ ...valid, password: "password1!", confirmPassword: "password1!" });
    expect(result.success).toBe(false);
  });
  it("rejects password without number", () => {
    const result = registerSchema.safeParse({ ...valid, password: "Password!", confirmPassword: "Password!" });
    expect(result.success).toBe(false);
  });
  it("rejects short name", () => {
    const result = registerSchema.safeParse({ ...valid, name: "J" });
    expect(result.success).toBe(false);
  });
});
describe("forgotPasswordSchema", () => {
  it("accepts valid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "user@test.com" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid email", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-valid" });
    expect(result.success).toBe(false);
  });
});
