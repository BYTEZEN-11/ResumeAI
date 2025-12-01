import { test, expect } from "@playwright/test";
test.describe("Authentication", () => {
  test("shows signin page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });
  test("shows signup page", async ({ page }) => {
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page.getByLabel("Full Name")).toBeVisible();
  });
  test("shows password strength indicator", async ({ page }) => {
    await page.goto("/auth/signup");
    await page.getByLabel("Password").fill("test");
    await expect(page.getByText("At least 8 characters")).toBeVisible();
  });
  test("navigates to signup from signin", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL("/auth/signup");
  });
  test("shows forgot password page", async ({ page }) => {
    await page.goto("/auth/forgot-password");
    await expect(page.getByRole("heading", { name: "Forgot password?" })).toBeVisible();
  });
  test("shows demo credentials on signin page", async ({ page }) => {
    await page.goto("/auth/signin");
    await expect(page.getByText("Demo Account")).toBeVisible();
  });
  test("demo login redirects to dashboard", async ({ page }) => {
    await page.goto("/auth/signin");
    await page.getByLabel("Email").fill("demo@resumerank.ai");
    await page.getByLabel("Password").fill("Demo@123456");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/dashboard", { timeout: 10000 });
  });
});
