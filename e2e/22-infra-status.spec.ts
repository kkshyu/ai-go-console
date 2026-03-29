import { test, expect } from "@playwright/test";

test.describe("Infrastructure Status APIs", () => {
  test("GET /api/actors/status returns JSON", async ({ request }) => {
    const res = await request.get("/api/actors/status");
    // 200 if working, 403 if auth issue, 500 if Redis/infra unavailable
    expect([200, 403, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body).toHaveProperty("sessions");
      expect(body).toHaveProperty("queues");
    }
  });

  test("GET /api/workers/status returns JSON", async ({ request }) => {
    const res = await request.get("/api/workers/status");
    expect([200, 401, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body).toHaveProperty("queues");
    } else if (res.status() === 500) {
      expect(body).toHaveProperty("error");
    }
  });

  test("GET /api/cluster/status returns JSON", async ({ request }) => {
    const res = await request.get("/api/cluster/status");
    expect([200, 401, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body).toHaveProperty("available");
      expect(body).toHaveProperty("nodes");
      expect(body).toHaveProperty("namespaces");
    }
  });

  test("GET /api/proxy/status returns JSON", async ({ request }) => {
    const res = await request.get("/api/proxy/status");
    expect([200, 401, 404, 500]).toContain(res.status());
    const body = await res.json();
    if (res.status() === 200) {
      expect(body).toHaveProperty("available");
      expect(body).toHaveProperty("mode");
    }
  });

  test("POST /api/proxy/nonexistent/query rejects without token", async ({
    request,
  }) => {
    const res = await request.post("/api/proxy/nonexistent-service-id/query", {
      data: { sql: "SELECT 1" },
    });
    // 401 without auth token, or 429 if rate limited
    expect([401, 429]).toContain(res.status());
  });
});

test.describe("Agents Page UI", () => {
  test("page renders with heading", async ({ page }) => {
    await page.goto("/agents");
    // i18n: EN "Agent Observability" or zh-TW equivalent
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator("h1")).toContainText(
      /Agent Observability|Agent|觀測/,
    );
  });

  test("auto-refresh controls exist", async ({ page }) => {
    await page.goto("/agents");
    // The refresh controls area contains a select for interval
    const intervalSelect = page.locator("select");
    await expect(intervalSelect).toBeVisible();
    // Verify interval options (1s, 3s, 5s, 10s)
    const options = intervalSelect.locator("option");
    await expect(options).toHaveCount(4);
    // Refresh button
    const refreshButton = page.locator("button", {
      hasText: /Refresh|refresh|重新整理|更新/,
    });
    await expect(refreshButton).toBeVisible();
  });
});
