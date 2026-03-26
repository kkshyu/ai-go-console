import { test, expect } from "@playwright/test";

test.describe("Data Sources", () => {
  let createdId: string;

  test("GET /api/data-sources returns empty array initially", async ({
    request,
  }) => {
    const res = await request.get("/api/data-sources");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /api/data-sources creates a PostgreSQL data source", async ({
    request,
  }) => {
    const res = await request.post("/api/data-sources", {
      data: {
        name: "E2E Test Postgres",
        type: "postgres",
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
    expect(body.type).toBe("postgres");
    expect(body.id).toBeDefined();
    createdId = body.id;
  });

  test("POST /api/data-sources creates a Supabase data source", async ({
    request,
  }) => {
    const res = await request.post("/api/data-sources", {
      data: {
        name: "E2E Test Supabase",
        type: "supabase",
        projectUrl: "https://test.supabase.co",
        apiKey: "test-anon-key",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.type).toBe("supabase");
  });

  test("POST /api/data-sources rejects missing name", async ({ request }) => {
    const res = await request.post("/api/data-sources", {
      data: { type: "postgres" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/data-sources lists created sources", async ({ request }) => {
    const res = await request.get("/api/data-sources");
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    // Should NOT contain credentials in response
    for (const ds of body) {
      expect(ds.credentialsEncrypted).toBeUndefined();
      expect(ds.iv).toBeUndefined();
      expect(ds.authTag).toBeUndefined();
    }
  });

  test("PATCH /api/data-sources/:id updates name", async ({ request }) => {
    const res = await request.patch(`/api/data-sources/${createdId}`, {
      data: { name: "E2E Updated Postgres" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("E2E Updated Postgres");
  });

  test("POST /api/data-sources/:id/test tests connection", async ({
    request,
  }) => {
    const res = await request.post(`/api/data-sources/${createdId}/test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should return success/failure (localhost:5432 is our actual PG)
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("message");
  });

  test("data sources page shows form on Add button click", async ({
    page,
  }) => {
    await page.goto("/data-sources");
    await page.click("button:has-text('Add Data Source'), button:has-text('新增資料來源')");
    // Form should appear
    await expect(page.locator('input[placeholder="My Database"]')).toBeVisible();
  });

  test("DELETE /api/data-sources/:id removes data source", async ({
    request,
  }) => {
    const res = await request.delete(`/api/data-sources/${createdId}`);
    expect(res.status()).toBe(200);

    // Verify it's gone
    const getRes = await request.get(`/api/data-sources/${createdId}`);
    expect(getRes.status()).toBe(404);
  });
});
