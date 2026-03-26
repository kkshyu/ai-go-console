import { test, expect } from "@playwright/test";

test.describe("Credentials", () => {
  let createdId: string;

  test("GET /api/credentials returns empty array initially", async ({
    request,
  }) => {
    const res = await request.get("/api/credentials");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("POST /api/credentials creates a PostgreSQL credential", async ({
    request,
  }) => {
    const res = await request.post("/api/credentials", {
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

  test("POST /api/credentials creates a Supabase credential", async ({
    request,
  }) => {
    const res = await request.post("/api/credentials", {
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

  test("POST /api/credentials rejects missing name", async ({ request }) => {
    const res = await request.post("/api/credentials", {
      data: { type: "postgres" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/credentials lists created credentials", async ({ request }) => {
    const res = await request.get("/api/credentials");
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(2);
    // Should NOT contain encrypted data in response
    for (const ds of body) {
      expect(ds.credentialsEncrypted).toBeUndefined();
      expect(ds.iv).toBeUndefined();
      expect(ds.authTag).toBeUndefined();
    }
  });

  test("PATCH /api/credentials/:id updates name", async ({ request }) => {
    const res = await request.patch(`/api/credentials/${createdId}`, {
      data: { name: "E2E Updated Postgres" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("E2E Updated Postgres");
  });

  test("POST /api/credentials/:id/test tests connection", async ({
    request,
  }) => {
    const res = await request.post(`/api/credentials/${createdId}/test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Should return success/failure (localhost:5432 is our actual PG)
    expect(body).toHaveProperty("success");
    expect(body).toHaveProperty("message");
  });

  test("credentials page shows form on Add button click", async ({
    page,
  }) => {
    await page.goto("/credentials");
    await page.click("button:has-text('Add Credential'), button:has-text('新增憑證')");
    // Form should appear
    await expect(page.locator('input[placeholder="My Database"]')).toBeVisible();
  });

  test("DELETE /api/credentials/:id removes credential", async ({
    request,
  }) => {
    const res = await request.delete(`/api/credentials/${createdId}`);
    expect(res.status()).toBe(200);

    // Verify it's gone
    const getRes = await request.get(`/api/credentials/${createdId}`);
    expect(getRes.status()).toBe(404);
  });
});
