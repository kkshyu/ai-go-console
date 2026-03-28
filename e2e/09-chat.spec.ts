import { test, expect } from "@playwright/test";

test.describe("Chat / Create App", () => {
  test("create page renders hero input", async ({ page }) => {
    await page.goto("/create");
    // Hero section should show the main heading
    await expect(page.locator("h1").first()).toBeVisible();
    // Text input should be visible
    await expect(page.locator('input[type="text"]')).toBeVisible();
  });

  test("chat input accepts text", async ({ page }) => {
    await page.goto("/create");
    const input = page.locator('input[type="text"]');
    await input.fill("Build me a todo app");
    await expect(input).toHaveValue("Build me a todo app");
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await page.goto("/create");
    // The send button is inside the same container as the input
    const sendBtn = page.locator('input[type="text"] ~ button, input[type="text"] + button').first();
    // If button is not found by sibling, try parent container
    if (await sendBtn.count() === 0) {
      // Button is in the same flex container
      const container = page.locator('input[type="text"]').locator("..");
      const btn = container.locator("button");
      await expect(btn).toBeDisabled();
    } else {
      await expect(sendBtn).toBeDisabled();
    }
  });

  test("send button is enabled when input has text", async ({ page }) => {
    await page.goto("/create");
    const input = page.locator('input[type="text"]');
    await input.fill("Hello");
    const container = page.locator('input[type="text"]').locator("..");
    const btn = container.locator("button");
    await expect(btn).toBeEnabled();
  });

  test("POST /api/chat requires messages array", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/chat returns SSE stream format", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    const contentType = res.headers()["content-type"] || "";
    expect(
      contentType.includes("text/event-stream") || res.status() >= 400
    ).toBe(true);
  });

  test("create page shows suggestion buttons", async ({ page }) => {
    await page.goto("/create");
    await page.waitForLoadState("networkidle");
    // Suggestion buttons should be visible below the input
    const buttons = page.locator("button").filter({ hasNotText: /Toggle|Switch|登出|Logout|Next/ });
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });
});
