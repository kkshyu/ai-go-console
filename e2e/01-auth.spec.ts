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
    // Accept 201 (created) or 429 (rate limited from previous test runs)
    if (res.status() === 429) {
      test.skip(true, "Rate limited — skipping registration tests");
      return;
    }
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
    if (res.status() === 429) {
      test.skip(true, "Rate limited");
      return;
    }
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
    if (res.status() === 429) {
      test.skip(true, "Rate limited");
      return;
    }
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("user");
  });

  test("login page renders", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await context.close();
  });

  test("login via UI with seed account", async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@example.com");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 10_000,
    });
    expect(page.url()).not.toContain("/login");
    await context.close();
  });

  test("reject empty credentials via API", async ({ request }) => {
    const res = await request.post("/api/auth/register", {
      data: { email: "", password: "" },
    });
    // Accept 400 (validation) or 429 (rate limited)
    expect([400, 429]).toContain(res.status());
  });
});
