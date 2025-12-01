import { test, expect } from "@playwright/test";
test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });
  test("shows hero section", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/ATS/i)).toBeVisible();
  });
  test("shows features section", async ({ page }) => {
    await page.locator("#features").scrollIntoViewIfNeeded();
    await expect(page.getByText("ATS Score")).toBeVisible();
    await expect(page.getByText("Skill Gap Analysis")).toBeVisible();
  });
  test("shows pricing section", async ({ page }) => {
    await page.locator("#pricing").scrollIntoViewIfNeeded();
    await expect(page.getByText("Free")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
  });
  test("CTA links to signup", async ({ page }) => {
    const cta = page.getByRole("link", { name: /Analyze My Resume Free/i });
    await expect(cta).toHaveAttribute("href", "/auth/signup");
  });
  test("has working navigation", async ({ page }) => {
    await page.getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/auth/signin");
  });
  test("passes basic accessibility", async ({ page }) => {
    const violations = await page.evaluate(() => {
      return document.querySelectorAll("img:not([alt])").length;
    });
    expect(violations).toBe(0);
  });
});
