import { describe, it, expect, afterAll } from "vitest";
import { authService } from "@/modules/auth/services/auth.service";
import { db } from "@/lib/db";
describe("Authentication Integration Tests", () => {
  let testUserId: string;
  const testEmail = `test-${Date.now()}@example.com`;
  afterAll(async () => {

    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });
  describe("User Registration", () => {
    it("should register a new user successfully", async () => {
      const result = await authService.register({
        name: "Test User",
        email: testEmail,
        password: "Password123!",
      });
      expect(result).toBeDefined();
      expect(result.email).toBe(testEmail);
      expect(result.name).toBe("Test User");
      expect(result.role).toBe("USER");
      testUserId = result.id;

      const profile = await db.profile.findUnique({
        where: { userId: testUserId },
      });
      expect(profile).toBeDefined();
      const subscription = await db.subscription.findUnique({
        where: { userId: testUserId },
      });
      expect(subscription).toBeDefined();
      expect(subscription?.plan).toBe("FREE");
      expect(subscription?.analysesLimit).toBe(3);
    });
    it("should not allow duplicate email registration", async () => {
      await expect(
        authService.register({
          name: "Test User 2",
          email: testEmail,
          password: "Password123!",
        })
      ).rejects.toThrow();
    });
    it("should reject weak passwords", async () => {
      await expect(
        authService.register({
          name: "Test User",
          email: `test2-${Date.now()}@example.com`,
          password: "weak",
        })
      ).rejects.toThrow();
    });
  });
  describe("Password Reset", () => {
    it("should generate password reset token", async () => {
      await expect(
        authService.sendPasswordResetEmail(testEmail)
      ).resolves.not.toThrow();

      const tokenRecord = await db.verificationToken.findFirst({
        where: { identifier: testEmail },
      });
      expect(tokenRecord).toBeDefined();
      expect(tokenRecord?.token).toMatch(/^[a-f0-9]{64}$/);
      expect(tokenRecord?.expires.getTime()).toBeGreaterThan(Date.now());
    });
  });
});
