import { test, expect } from "@playwright/test";

test.describe("Navigation & i18n", () => {
  test("sidebar shows all nav items", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Dashboard|儀表板/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Apps|應用程式/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Create App|建立應用/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Credentials|憑證/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /User Management|使用者管理/ })).toBeVisible();
  });

  test("navigate to Apps page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/apps"]');
    await expect(page).toHaveURL(/\/apps/);
    await expect(page.locator("h1")).toContainText(/Apps|應用程式/);
  });

  test("navigate to Create App page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/create"]');
    await expect(page).toHaveURL(/\/create/);
    await expect(page.locator("h1")).toContainText(/Create App|建立應用/);
  });

  test("navigate to Credentials page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/credentials"]');
    await expect(page).toHaveURL(/\/credentials/);
    await expect(page.locator("h1")).toContainText(/Credentials|憑證/);
  });

  test("navigate to Users page", async ({ page }) => {
    await page.goto("/");
    await page.click('a[href="/users"]');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator("h1")).toContainText(/User Management|使用者管理/);
  });

  test("language toggle switches between EN and zh-TW", async ({ page }) => {
    await page.goto("/");
    // Check current language
    const dashboardText = await page.locator("h1").textContent();
    const isEnglish = dashboardText?.includes("Dashboard");

    // Click globe icon to toggle language
    await page.click('button[title="Switch Language"]');
    await page.waitForLoadState("networkidle");

    // Verify language changed
    const newText = await page.locator("h1").textContent();
    if (isEnglish) {
      expect(newText).toContain("儀表板");
    } else {
      expect(newText).toContain("Dashboard");
    }
  });

  test("AI Go logo and title in sidebar", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("AI Go")).toBeVisible();
  });
});
