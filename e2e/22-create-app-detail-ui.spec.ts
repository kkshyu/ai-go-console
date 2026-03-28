import { test, expect } from "@playwright/test";
import { createApp } from "./helpers";

test.describe("Create Page UI", () => {
  test("preset template cards are visible", async ({ page }) => {
    await page.goto("/create");
    const templateCards = page.locator("button.group");
    await expect(templateCards.first()).toBeVisible();
    expect(await templateCards.count()).toBeGreaterThanOrEqual(4);
  });

  test("view all templates and filter by category", async ({ page }) => {
    await page.goto("/create");

    const viewAllBtn = page.locator("button", {
      hasText: /View All|檢視全部/,
    });
    await viewAllBtn.click();

    const allCategoriesBtn = page.locator("button", {
      hasText: /All Categories|全部分類/,
    });
    await expect(allCategoriesBtn).toBeVisible();

    const allTemplates = page.locator("button.group");
    const totalBefore = await allTemplates.count();
    expect(totalBefore).toBeGreaterThan(8);

    // Click the first specific category (second button after "All Categories")
    await allCategoriesBtn.locator("..").locator("button").nth(1).click();

    const filteredCount = await allTemplates.count();
    expect(filteredCount).toBeLessThan(totalBefore);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test("AI input field is visible and accepts text", async ({ page }) => {
    await page.goto("/create");
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill("Build me a CRM app");
    await expect(input).toHaveValue("Build me a CRM app");
  });

  test("suggestion buttons exist and navigate to chat", async ({ page }) => {
    await page.goto("/create");
    const suggestions = page.locator(
      "button.rounded-full.border.bg-background"
    );
    await expect(suggestions.first()).toBeVisible();
    expect(await suggestions.count()).toBeGreaterThanOrEqual(3);

    await suggestions.first().click();

    // Clicking a suggestion transitions to chat mode
    await expect(
      page.locator("button", { hasText: /Back|返回/ })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("App Detail Page UI", () => {
  const ts = Date.now();
  const appName = `E2E DetailUI ${ts}`;
  let appId: string;

  test("setup: create test app", async ({ request }) => {
    const sessionRes = await request.get("/api/auth/session");
    const session = await sessionRes.json();
    const userId = session.user.id;
    expect(userId).toBeDefined();

    const body = await createApp(request, {
      name: appName,
      template: "react-spa",
      description: "E2E test for detail UI",
      userId,
    });
    appId = body.id;
    expect(appId).toBeDefined();
  });

  test("app name displays in the header", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    await expect(page.locator("h1")).toContainText(appName);
  });

  test("status badge is visible", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    // Badge is a sibling div after h1 inside the title bar
    const titleBar = page.locator(".flex.items-center.gap-3").first();
    const badge = titleBar.locator("div.rounded-full.border").first();
    await expect(badge).toBeVisible();
    expect(await badge.textContent()).toBeTruthy();
  });

  test("chat panel is visible with input area", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    const chatArea = page.locator("textarea, input[placeholder]").first();
    await expect(chatArea).toBeVisible({ timeout: 10000 });
  });

  test("play button visible when dev server is stopped", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    const playButton = page.locator("button", {
      hasText: /Start|啟動|Preview/,
    });
    await expect(playButton).toBeVisible({ timeout: 10000 });
  });

  test("cleanup: delete test app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.delete(`/api/apps/${appId}`);
    expect(res.status()).toBe(200);
  });
});
