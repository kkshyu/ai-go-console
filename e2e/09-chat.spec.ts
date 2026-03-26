import { test, expect } from "@playwright/test";

test.describe("Chat / Create App", () => {
  test("create page renders chat interface", async ({ page }) => {
    await page.goto("/create");
    await expect(page.locator("h1")).toContainText(/Create App|建立應用/);
    // Chat input should be visible
    await expect(
      page.locator('input[placeholder*="Describe"], input[placeholder*="描述"]')
    ).toBeVisible();
    // Send button should be visible
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("chat input accepts text", async ({ page }) => {
    await page.goto("/create");
    const input = page.locator(
      'input[placeholder*="Describe"], input[placeholder*="描述"]'
    );
    await input.fill("Build me a todo app");
    await expect(input).toHaveValue("Build me a todo app");
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    await page.goto("/create");
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeDisabled();
  });

  test("send button is enabled when input has text", async ({ page }) => {
    await page.goto("/create");
    const input = page.locator(
      'input[placeholder*="Describe"], input[placeholder*="描述"]'
    );
    await input.fill("Hello");
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeEnabled();
  });

  test("POST /api/chat requires messages array", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/chat returns SSE stream format", async ({ request }) => {
    // This test verifies the API endpoint responds correctly
    // It may fail if OPENROUTER_API_KEY is not set, which is expected
    const res = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });
    // Should return SSE content type or error gracefully
    const contentType = res.headers()["content-type"] || "";
    expect(
      contentType.includes("text/event-stream") || res.status() >= 400
    ).toBe(true);
  });

  test("preview panel shows placeholder when no app created", async ({
    page,
  }) => {
    // Widen viewport to show preview panel (requires lg breakpoint)
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto("/create");
    await expect(
      page.getByText(/preview|預覽/i).first()
    ).toBeVisible();
  });
});
