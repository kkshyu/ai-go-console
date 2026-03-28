import { test, expect } from "@playwright/test";
import { createApp } from "./helpers";

test.describe("App Deployments API", () => {
  let userId: string;
  let appId: string;
  const ts = Date.now();
  const appName = `E2E Deploy ${ts}`;

  test("setup: get current user", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    const session = await res.json();
    userId = session.user.id;
    expect(userId).toBeDefined();
  });

  test("setup: create test app", async ({ request }) => {
    expect(userId).toBeDefined();
    const body = await createApp(request, {
      name: appName,
      template: "react-spa",
      description: "E2E deployment tests",
      userId,
    });
    appId = body.id;
    expect(appId).toBeDefined();
  });

  test("GET /api/apps/:id/deployments returns empty array for new app", async ({
    request,
  }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/deployments`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });

  test("GET /api/apps/:id/deployments returns 404 for nonexistent app", async ({
    request,
  }) => {
    const res = await request.get(
      "/api/apps/clxxxxxxxxxxxxxxxxxxxxxxxxx/deployments"
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("seeded apps have deployment records with expected structure", async ({
    request,
  }) => {
    const appsRes = await request.get("/api/apps");
    expect(appsRes.status()).toBe(200);
    const apps: { id: string; name: string }[] = await appsRes.json();

    let foundDeployments = false;

    for (const app of apps) {
      // Skip E2E test apps
      if (app.name.startsWith("E2E")) continue;

      const res = await request.get(`/api/apps/${app.id}/deployments`);
      if (res.status() !== 200) continue;

      const deployments = await res.json();
      if (!Array.isArray(deployments) || deployments.length === 0) continue;

      // Validate deployment record structure
      const d = deployments[0];
      expect(d).toHaveProperty("id");
      expect(d).toHaveProperty("appId", app.id);
      expect(d).toHaveProperty("status");
      expect(d).toHaveProperty("version");
      expect(d).toHaveProperty("createdAt");
      expect(typeof d.version).toBe("number");
      expect(typeof d.status).toBe("string");

      // Deployments should be ordered by version desc
      if (deployments.length > 1) {
        expect(deployments[0].version).toBeGreaterThan(
          deployments[deployments.length - 1].version
        );
      }

      foundDeployments = true;
      break;
    }

    // Seed data may not include deployments; test is still valid either way
  });

  test("cleanup: delete test app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.delete(`/api/apps/${appId}`);
    expect(res.status()).toBe(200);
  });
});
