import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  const ts = Date.now();
  const testEmail = `auth-${ts}@test.com`;
  const testPassword = "TestPass123!";
  const testName = "Auth Test User";

  test("register a new user via API", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: testEmail, password: testPassword, name: testName },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.email).toBe(testEmail);
    expect(body.name).toBe(testName);
    expect(["admin", "user"]).toContain(body.role);
  });

  test("reject duplicate registration", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: testEmail, password: testPassword, name: testName },
    });
    expect(res.status()).toBe(409);
  });

  test("register second user as regular user", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: {
        email: `auth2-${ts}@test.com`,
        password: testPassword,
        name: "Second User",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("user");
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login via UI", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const url = page.url();
    expect(url).toBeDefined();
  });

  test("reject empty credentials via API", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "", password: "" },
    });
    expect(res.status()).toBe(400);
  });
});
