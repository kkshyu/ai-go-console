import { test, expect } from "@playwright/test";

test.describe("Quick Create Preset Preview", () => {
  test("clicking a quick-create preset opens app detail with preview", async ({
    page,
    request,
  }) => {
    let createdAppId: string | null = null;
    try {
      await page.goto("/create");

      const presetCards = page.locator("button.group");
      await expect(presetCards.first()).toBeVisible({ timeout: 10_000 });
      await presetCards.first().click();

      await page.waitForURL(/\/apps\/[^/?]+(\?.*)?$/, { timeout: 120_000 });

      const appIdMatch = page.url().match(/\/apps\/([^/?]+)/);
      createdAppId = appIdMatch?.[1] ?? null;
      expect(createdAppId).toBeTruthy();

      // Confirm app detail page loaded and preview/dev area is available.
      await expect(page.locator("h1")).toBeVisible({ timeout: 10_000 });
      await expect(
        page
          .locator("button")
          .filter({ hasText: /開發環境|Dev Environment|Preview|預覽/ })
          .first()
      ).toBeVisible({ timeout: 10_000 });

      const previewIframe = page.locator("iframe");
      const devControlButton = page.locator("button", {
        hasText: /Start Dev|Stop Dev|啟動開發環境|停止開發環境/,
      });

      // Preview is considered available when iframe is shown or dev controls are present.
      await expect(previewIframe.first().or(devControlButton)).toBeVisible({
        timeout: 30_000,
      });
    } finally {
      if (createdAppId) {
        await request.delete(`/api/apps/${createdAppId}`);
      }
    }
  });
});
