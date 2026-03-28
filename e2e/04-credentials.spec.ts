import { test, expect } from "@playwright/test";

test.describe("Services", () => {
  let createdId: string;

  test("GET /api/services returns array", async ({ request }) => {
    const res = await request.get("/api/services");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /api/services creates a PostgreSQL service", async ({
    request,
  }) => {
    const res = await request.post("/api/services", {
      data: {
        name: "E2E Test Postgres",
        type: "postgresql",
        endpointUrl: "http://localhost:3000/rest",
        host: "localhost",
        port: "5432",
        database: "testdb",
        username: "testuser",
        password: "testpass",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("E2E Test Postgres");
    expect(body.type).toBe("postgresql");
    expect(body.id).toBeDefined();
    createdId = body.id;
  });

  test("POST /api/services creates a Supabase service", async ({
    request,
  }) => {
    const res = await request.post("/api/services", {
      data: {
        name: "E2E Test Supabase",
        type: "supabase",
        endpointUrl: "https://test.supabase.co",
        projectUrl: "https://test.supabase.co",
        apiKey: "test-anon-key",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.type).toBe("supabase");
  });

  test("POST /api/services rejects missing name", async ({ request }) => {
    const res = await request.post("/api/services", {
      data: { type: "postgresql" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/services lists created services", async ({ request }) => {
    const res = await request.get("/api/services");
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    // Should NOT contain encrypted data in response
    for (const svc of body) {
      expect(svc.configEncrypted).toBeUndefined();
      expect(svc.iv).toBeUndefined();
      expect(svc.authTag).toBeUndefined();
    }
  });

  test("PATCH /api/services/:id updates name", async ({ request }) => {
    const res = await request.patch(`/api/services/${createdId}`, {
      data: { name: "E2E Updated Postgres" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("E2E Updated Postgres");
  });

  test("POST /api/services/:id/test tests connection", async ({
    request,
  }) => {
    const res = await request.post(`/api/services/${createdId}/test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("message");
  });

  test("services page shows form on Add button click", async ({
    page,
  }) => {
    await page.goto("/services");
    // Click "Add Service" button
    await page.click("button:has-text('Add Service'), button:has-text('新增服務')");
    // Category select should appear
    await expect(page.locator("select").first()).toBeVisible();
  });

  test("DELETE /api/services/:id removes service", async ({
    request,
  }) => {
    const res = await request.delete(`/api/services/${createdId}`);
    expect(res.status()).toBe(200);

    // Verify it's gone
    const getRes = await request.get(`/api/services/${createdId}`);
    expect(getRes.status()).toBe(404);
  });
});
