import { test as setup, expect } from "@playwright/test";
import { STORAGE_STATE } from "./constants";

/**
 * Global setup: login with seed admin account and save auth state.
 * All subsequent tests reuse this state so they don't need to login again.
 */
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "admin@example.com");
  await page.fill('input[type="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });
  await page.context().storageState({ path: STORAGE_STATE });
});
