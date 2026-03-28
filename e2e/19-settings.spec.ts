import { test, expect } from "@playwright/test";
import { SEED_ADMIN } from "./helpers";

test.describe("Settings API — Profile", () => {
  test("GET /api/settings/profile returns current user", async ({
    request,
  }) => {
    const res = await request.get("/api/settings/profile");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.email).toBe(SEED_ADMIN.email);
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("role");
  });

  test("PATCH /api/settings/profile updates name", async ({ request }) => {
    const newName = `E2E Admin ${Date.now()}`;
    const res = await request.patch("/api/settings/profile", {
      data: { name: newName },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe(newName);

    // Restore original name
    const restore = await request.patch("/api/settings/profile", {
      data: { name: SEED_ADMIN.name },
    });
    expect(restore.status()).toBe(200);
  });

  test("PATCH /api/settings/profile rejects empty name", async ({
    request,
  }) => {
    const res = await request.patch("/api/settings/profile", {
      data: { name: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("PATCH /api/settings/profile rejects whitespace-only name", async ({
    request,
  }) => {
    const res = await request.patch("/api/settings/profile", {
      data: { name: "   " },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Settings API — Password", () => {
  const TEMP_PASSWORD = "TempPass789!";

  test("PUT /api/settings/password changes password and restores it", async ({
    request,
  }) => {
    // Change to temporary password
    const res = await request.put("/api/settings/password", {
      data: {
        currentPassword: SEED_ADMIN.password,
        newPassword: TEMP_PASSWORD,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Restore original password
    const restore = await request.put("/api/settings/password", {
      data: {
        currentPassword: TEMP_PASSWORD,
        newPassword: SEED_ADMIN.password,
      },
    });
    expect(restore.status()).toBe(200);
  });

  test("PUT /api/settings/password rejects wrong current password", async ({
    request,
  }) => {
    const res = await request.put("/api/settings/password", {
      data: {
        currentPassword: "wrongPassword999",
        newPassword: "NewPass123!",
      },
    });
    expect(res.status()).toBe(403);
  });

  test("PUT /api/settings/password rejects missing fields", async ({
    request,
  }) => {
    const res = await request.put("/api/settings/password", {
      data: { currentPassword: SEED_ADMIN.password },
    });
    expect(res.status()).toBe(400);
  });

  test("PUT /api/settings/password rejects short new password", async ({
    request,
  }) => {
    const res = await request.put("/api/settings/password", {
      data: {
        currentPassword: SEED_ADMIN.password,
        newPassword: "ab",
      },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe("Settings Page UI", () => {
  test("settings page renders profile form", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.locator("h1")).toContainText(/Settings|設定/);

    const nameInput = page.locator(
      'input:not([disabled]):not([type="password"])'
    );
    await expect(nameInput.first()).toBeVisible();

    const emailInput = page.locator("input[disabled]");
    await expect(emailInput.first()).toBeVisible();
    await expect(emailInput.first()).toHaveValue(SEED_ADMIN.email);
  });

  test("settings page renders password change form", async ({ page }) => {
    await page.goto("/settings");

    const passwordInputs = page.locator('input[type="password"]');
    await expect(passwordInputs).toHaveCount(3);
  });

  test("settings page renders language selector", async ({ page }) => {
    await page.goto("/settings");

    await expect(
      page.getByRole("button", { name: /English|英文/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /繁體中文|中文/ })
    ).toBeVisible();
  });
});
