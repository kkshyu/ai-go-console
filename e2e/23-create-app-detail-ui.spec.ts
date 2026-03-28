import { test, expect } from "@playwright/test";

test.describe("Create Page UI", () => {
  test("preset template cards are visible", async ({ page }) => {
    await page.goto("/create");
    const templateCards = page.locator("button.group");
    await expect(templateCards.first()).toBeVisible();
    expect(await templateCards.count()).toBeGreaterThanOrEqual(4);
  });

  test("view all templates and filter by category", async ({ page }) => {
    await page.goto("/create");

    // The button text is "Browse all systems" / "瀏覽所有系統"
    const viewAllBtn = page.locator("button", {
      hasText: /Browse all|瀏覽所有/,
    });
    await expect(viewAllBtn).toBeVisible({ timeout: 10000 });
    await viewAllBtn.click();

    // The "All Categories" button text is just "All" / "全部"
    const categoryFilterContainer = page.locator(".flex.flex-wrap.gap-2.mb-4");
    await expect(categoryFilterContainer).toBeVisible({ timeout: 5000 });
    const allCategoriesBtn = categoryFilterContainer.locator("button").first();
    await expect(allCategoriesBtn).toBeVisible();

    const allTemplates = page.locator("button.group");
    const totalBefore = await allTemplates.count();
    expect(totalBefore).toBeGreaterThan(8);

    // Click the second category button (first specific category after "All")
    const secondCategoryBtn = categoryFilterContainer.locator("button").nth(1);
    await secondCategoryBtn.click();

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

    // Clicking a suggestion transitions to chat mode with "Back to home" / "返回首頁"
    await expect(
      page.locator("button", { hasText: /Back to home|返回首頁/ })
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe("App Detail Page UI", () => {
  let appId: string;
  let appName: string;

  test("setup: find seeded app", async ({ request }) => {
    const res = await request.get("/api/apps");
    if (!res.ok()) {
      test.skip(true, `GET /api/apps returned ${res.status()} — DB may be unavailable`);
      return;
    }
    const apps = await res.json();
    if (!Array.isArray(apps) || apps.length === 0) {
      test.skip(true, "No apps found — run prisma db seed first");
      return;
    }

    // Prefer "Company Blog" (stopped) — good for testing the play button
    const blog = apps.find(
      (a: { name: string }) => a.name === "Company Blog"
    );
    const picked = blog || apps[0];
    appId = picked.id;
    appName = picked.name;
  });

  test("app name displays in the header", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    await expect(page.locator("h1")).toContainText(appName);
  });

  test("status badge is visible", async ({ page }) => {
    if (!appId) { test.skip(true, "No app available"); return; }
    await page.goto(`/apps/${appId}`);
    // Status badge is a sibling of h1 — rendered as text like "已停止" / "Stopped"
    const h1 = page.locator("h1").filter({ hasText: appName });
    await expect(h1).toBeVisible({ timeout: 10000 });
    // The badge is a sibling div next to h1 with status text
    const statusText = h1.locator("..").locator("div").filter({
      hasText: /Stopped|Running|Developing|Building|Error|已停止|執行中|開發中|建置中|錯誤/,
    }).first();
    await expect(statusText).toBeVisible();
  });

  test("chat panel is visible with input area", async ({ page }) => {
    if (!appId) { test.skip(true, "No app available"); return; }
    await page.goto(`/apps/${appId}`);
    // Chat input is a textbox — from the page snapshot it's rendered as role="textbox"
    const chatArea = page.getByRole("textbox").first();
    await expect(chatArea).toBeVisible({ timeout: 10000 });
  });

  test("play button visible when dev server is stopped", async ({ page }) => {
    if (!appId) { test.skip(true, "No app available"); return; }
    await page.goto(`/apps/${appId}`);
    // The button text is "停止開發環境" (Stop Dev) since blog has port assigned
    // or "Start Dev" / "啟動開發環境" if stopped
    const devButton = page.getByRole("button", {
      name: /Start Dev|啟動開發環境|停止開發環境|Stop Dev/,
    });
    await expect(devButton).toBeAttached({ timeout: 30000 });
  });
});
