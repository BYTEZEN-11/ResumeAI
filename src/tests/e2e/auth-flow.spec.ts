import { test, expect } from "@playwright/test";
test.describe("Authentication Flow", () => {
  test("should display sign-in page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.locator("h1")).toContainText(/sign in/i);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
  test("should display sign-up page", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.locator("h1")).toContainText(/sign up/i);
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
  test("should show validation errors for invalid email", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.fill('input[type="email"]', "invalid-email");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    await expect(page.locator("body")).toContainText(/invalid|error/i);
  });
  test("should navigate to forgot password page", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.click('text=/forgot.*password/i');
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator("h1")).toContainText(/forgot password/i);
  });
  test("should redirect unauthenticated users from dashboard", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/auth\/signin/);
  });
});
