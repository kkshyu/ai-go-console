import { test, expect } from "@playwright/test";

test.describe("Apps CRUD", () => {
  const ts = Date.now();
  let appId: string;
  let userId: string;

  test("setup: create test user", async ({ request }) => {
    const email = `apps-${ts}@test.com`;
    const res = await request.post("/api/auth/register", {
      data: { email, password: "Test1234!", name: "Apps User" },
    });
    expect(res.status()).toBe(201);
    const user = await res.json();
    userId = user.id;
    expect(userId).toBeDefined();
  });

  test("GET /api/apps returns array", async ({ request }) => {
    const res = await request.get("/api/apps");
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  test("POST /api/apps creates a react-spa app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E React ${ts}`,
        template: "react-spa",
        description: "Test React SPA",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe(`E2E React ${ts}`);
    expect(body.template).toBe("react-spa");
    expect(body.port).toBeGreaterThanOrEqual(3100);
    expect(body.status).toBe("developing");
    appId = body.id;
  });

  test("POST /api/apps creates a node-api app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E Node ${ts}`,
        template: "node-api",
        description: "Test Node API",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).template).toBe("node-api");
  });

  test("POST /api/apps creates a nextjs-fullstack app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E Next ${ts}`,
        template: "nextjs-fullstack",
        description: "Test Next.js",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    expect((await res.json()).template).toBe("nextjs-fullstack");
  });

  test("POST /api/apps rejects missing fields", async ({ request }) => {
    const res = await request.post("/api/apps", {
      data: { name: "No Template" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/apps auto-assigns unique slugs", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E React ${ts}`,
        template: "react-spa",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.slug).toContain("e2e-react");
  });

  test("GET /api/apps/:id returns app with relations", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(appId);
    expect(body.domains).toBeDefined();
    expect(body.dataSources).toBeDefined();
  });

  test("GET /api/apps lists all created apps", async ({ request }) => {
    const res = await request.get("/api/apps");
    const body = await res.json();
    const ours = body.filter((a: { name: string }) =>
      a.name.includes(String(ts))
    );
    expect(ours.length).toBeGreaterThanOrEqual(3);
  });

  test("apps page renders", async ({ page }) => {
    await page.goto("/apps");
    await expect(page.locator("h1")).toContainText(/Apps|應用程式/);
  });

  test("app detail page loads", async ({ page }) => {
    expect(appId).toBeDefined();
    await page.goto(`/apps/${appId}`);
    await expect(page.getByText(`E2E React ${ts}`)).toBeVisible();
  });

  test("DELETE /api/apps/:id removes app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.delete(`/api/apps/${appId}`);
    expect(res.status()).toBe(200);
    const getRes = await request.get(`/api/apps/${appId}`);
    expect(getRes.status()).toBe(404);
  });
});
