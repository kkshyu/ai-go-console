import { test, expect } from "@playwright/test";

test.describe("Organization API", () => {
  let orgId: string;
  const originalName = "Acme Corp";

  test("setup: get orgId from session", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    const session = await res.json();
    orgId = session.user.organizationId;
    expect(orgId).toBeDefined();
  });

  test("GET /api/organizations returns organization data", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.get("/api/organizations");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(orgId);
    expect(typeof body.name).toBe("string");
    expect(typeof body.slug).toBe("string");
    expect(body.name.length).toBeGreaterThan(0);
    expect(body.slug.length).toBeGreaterThan(0);
  });

  test("PUT /api/organizations/[orgId] updates organization name", async ({ request }) => {
    expect(orgId).toBeDefined();
    const newName = `E2E Test Org ${Date.now()}`;
    const res = await request.put(`/api/organizations/${orgId}`, {
      data: { name: newName },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(newName);
    expect(body.id).toBe(orgId);
  });

  test("PUT /api/organizations/[orgId] restores original name", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.put(`/api/organizations/${orgId}`, {
      data: { name: originalName },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(originalName);
  });
});

test.describe("Organization Settings Page", () => {
  test("renders organization name and slug fields", async ({ page }) => {
    await page.goto("/settings/organization");
    const nameInput = page.locator("input").first();
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await expect(nameInput).toHaveValue(/.+/);

    const slugInput = page.locator("input.font-mono");
    await expect(slugInput).toBeVisible();
    await expect(slugInput).toHaveValue(/.+/);
  });

  test("renders domain management section", async ({ page }) => {
    await page.goto("/settings/organization");
    await expect(page.locator("input").first()).toBeVisible({ timeout: 15_000 });

    const domainInput = page.locator("input[placeholder]").last();
    await expect(domainInput).toBeVisible();

    const addButton = page.locator("button").filter({ hasText: /add|新增|Add/i });
    await expect(addButton).toBeVisible();
  });
});
