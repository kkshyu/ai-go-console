import { test, expect } from "@playwright/test";

test.describe("Users Management", () => {
  let userId: string;

  test("GET /api/users returns user list", async ({ request }) => {
    const res = await request.get("/api/users");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    // Should have users from previous tests
    if (body.length > 0) {
      expect(body[0]).toHaveProperty("id");
      expect(body[0]).toHaveProperty("email");
      expect(body[0]).toHaveProperty("name");
      expect(body[0]).toHaveProperty("role");
      // Should NOT expose password
      expect(body[0].passwordHash).toBeUndefined();
    }
  });

  test("create a user for management tests", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: {
        email: `mgmt-user-${Date.now()}@test.com`,
        password: "Test1234!",
        name: "Mgmt Test User",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    userId = body.id;
  });

  test("PATCH /api/users/:id updates role", async ({ request }) => {
    const res = await request.patch(`/api/users/${userId}`, {
      data: { role: "admin" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.role).toBe("admin");
  });

  test("PATCH /api/users/:id updates name", async ({ request }) => {
    const res = await request.patch(`/api/users/${userId}`, {
      data: { name: "Updated Name" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Updated Name");
  });

  test("users page renders user list", async ({ page }) => {
    await page.goto("/users");
    await expect(page.locator("h1")).toContainText(/User Management|使用者管理/);
  });

  test("DELETE /api/users/:id removes user", async ({ request }) => {
    const res = await request.delete(`/api/users/${userId}`);
    expect(res.status()).toBe(200);
  });
});
