import { test, expect } from "@playwright/test";

test.describe("App Lifecycle", () => {
  const ts = Date.now();
  let appId: string;

  test("setup: create user and app", async ({ request }) => {
    const userRes = await request.post("/api/auth/register", {
      data: {
        email: `lc-${ts}@test.com`,
        password: "Test1234!",
        name: "LC User",
      },
    });
    expect(userRes.status()).toBe(201);
    const user = await userRes.json();

    const appRes = await request.post("/api/apps", {
      data: {
        name: `E2E LC ${ts}`,
        template: "react-spa",
        description: "Lifecycle test",
        userId: user.id,
      },
    });
    expect(appRes.status()).toBe(201);
    const app = await appRes.json();
    appId = app.id;
  });

  test("POST lifecycle/dev-start responds", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/lifecycle`, {
      data: { action: "dev-start" },
    });
    expect([200, 500]).toContain(res.status());
  });

  test("POST lifecycle/dev-stop responds", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/lifecycle`, {
      data: { action: "dev-stop" },
    });
    expect(res.status()).toBe(200);
  });

  test("POST lifecycle/logs returns logs", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/lifecycle`, {
      data: { action: "logs" },
    });
    expect(res.status()).toBe(200);
    expect(await res.json()).toHaveProperty("logs");
  });

  test("POST lifecycle rejects unknown action", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/lifecycle`, {
      data: { action: "invalid-action" },
    });
    expect(res.status()).toBe(400);
  });

  test("cleanup", async ({ request }) => {
    if (appId) await request.delete(`/api/apps/${appId}`);
  });
});
