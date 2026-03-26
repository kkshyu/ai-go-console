import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("renders dashboard with title", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    const text = await page.locator("h1").textContent();
    expect(text).toMatch(/Dashboard|儀表板/);
  });

  test("shows Total Apps stat card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Total Apps|應用程式總數/)).toBeVisible();
  });

  test("shows Running stat card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Running|執行中/)).toBeVisible();
  });

  test("shows Services stat card", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/Services|服務/).first()).toBeVisible();
  });

  test("shows empty state with create button", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByText(/Create your first app|建立第一個應用/)
    ).toBeVisible();
  });

  test("create button navigates to /create", async ({ page }) => {
    await page.goto("/");
    await page.getByText(/Create your first app|建立第一個應用/).click();
    await expect(page).toHaveURL(/\/create/);
  });
});
