import { type Page, type APIRequestContext } from "@playwright/test";

export const TEST_USER = {
  email: `e2e-admin-${Date.now()}@test.com`,
  password: "Test1234!",
  name: "E2E Admin",
};

export const TEST_USER_2 = {
  email: `e2e-user-${Date.now()}@test.com`,
  password: "Test1234!",
  name: "E2E User",
};

/**
 * Register a user via API
 */
export async function registerUser(
  request: APIRequestContext,
  user: { email: string; password: string; name: string }
) {
  const res = await request.post("/api/auth/register", {
    data: user,
  });
  return res;
}

/**
 * Login via the UI
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect to dashboard
  await page.waitForURL("/", { timeout: 10_000 }).catch(() => {});
}

/**
 * Create a data source via API
 */
export async function createDataSource(
  request: APIRequestContext,
  data: {
    name: string;
    type: string;
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
  }
) {
  const res = await request.post("/api/data-sources", { data });
  return res.json();
}

/**
 * Create an app via API
 */
export async function createApp(
  request: APIRequestContext,
  data: {
    name: string;
    template: string;
    description?: string;
    userId: string;
  }
) {
  const res = await request.post("/api/apps", { data });
  return res.json();
}

/**
 * Clean up test data
 */
export async function cleanupApps(request: APIRequestContext) {
  const res = await request.get("/api/apps");
  const apps = await res.json();
  for (const app of apps) {
    if (app.name?.startsWith("E2E")) {
      await request.delete(`/api/apps/${app.id}`);
    }
  }
}
