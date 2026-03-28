import { test, expect } from "@playwright/test";

test.describe("Navigation & i18n", () => {
  test("sidebar shows all nav items", async ({ page }) => {
    await page.goto("/apps");
    await expect(page.locator('a[href="/apps"]').first()).toBeVisible();
    await expect(page.locator('a[href="/create"]').first()).toBeVisible();
    await expect(page.locator('a[href="/services"]').first()).toBeVisible();
    await expect(page.locator('a[href="/users"]').first()).toBeVisible();
  });

  test("navigate to Apps page", async ({ page }) => {
    await page.goto("/create");
    await page.click('a[href="/apps"]');
    await expect(page).toHaveURL(/\/apps/);
    await expect(page.locator("h1")).toContainText(/Apps|應用程式/);
  });

  test("navigate to Create App page", async ({ page }) => {
    await page.goto("/apps");
    await page.click('a[href="/create"]');
    await expect(page).toHaveURL(/\/create/);
  });

  test("navigate to Services page", async ({ page }) => {
    await page.goto("/apps");
    await page.click('a[href="/services"]');
    await expect(page).toHaveURL(/\/services/);
    await expect(page.locator("h1")).toContainText(/Service List|服務/);
  });

  test("navigate to Users page", async ({ page }) => {
    await page.goto("/apps");
    await page.click('a[href="/users"]');
    await expect(page).toHaveURL(/\/users/);
    await expect(page.locator("h1")).toContainText(/User Management|使用者管理/);
  });

  test("language toggle switches between EN and zh-TW", async ({ page }) => {
    await page.goto("/apps");
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    const isEnglish = text?.includes("Apps");

    // Click globe icon to toggle language
    await page.click('button:has-text("Switch Language"), button[title="Switch Language"]');
    await page.waitForLoadState("networkidle");

    const newText = await h1.textContent();
    if (isEnglish) {
      expect(newText).toContain("應用程式");
    } else {
      expect(newText).toContain("Apps");
    }
  });

  test("AI Go logo and title in sidebar", async ({ page }) => {
    await page.goto("/apps");
    await expect(page.getByText("AI Go")).toBeVisible();
  });
});
