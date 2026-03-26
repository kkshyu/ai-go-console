import { test, expect } from "@playwright/test";

/**
 * Full admin flow:
 * 1. Admin registers and logs in
 * 2. Admin creates a new user in the same org
 * 3. Admin creates a service (authenticated)
 * 4. Admin creates an app with the service assigned
 * 5. Verify the app has the service attached
 * 6. Verify user appears in the org
 * 7. Cleanup
 */
test.describe("Admin: create user & assign service to app", () => {
  const ts = Date.now();
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  test("full admin flow: create user, service, assign to app", async ({
    page,
  }) => {
    const email = `admin-svc-${ts}@test.com`;
    const password = "Test1234!";

    // Step 1: Register admin via public API
    const regRes = await page.request.post(`${baseUrl}/api/auth/register`, {
      data: { email, password, name: "Admin SvcTest" },
    });
    expect(regRes.status()).toBe(201);
    const admin = await regRes.json();
    const adminUserId = admin.id;
    const orgId = admin.organizationId;
    expect(adminUserId).toBeDefined();
    expect(orgId).toBeDefined();

    // Step 2: Register a new user in the same org
    const userRes = await page.request.post(`${baseUrl}/api/auth/register`, {
      data: {
        email: `newuser-svc-${ts}@test.com`,
        password: "Test1234!",
        name: "New User",
        organizationId: orgId,
      },
    });
    expect(userRes.status()).toBe(201);
    const newUser = await userRes.json();
    const newUserId = newUser.id;
    expect(newUserId).toBeDefined();
    expect(newUser.role).toBe("user");
    expect(newUser.organizationId).toBe(orgId);

    // Step 3: Login via UI to establish session cookies
    await page.goto(`${baseUrl}/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Step 4: Create a PostgreSQL service (authenticated via page.evaluate)
    await page.goto(`${baseUrl}/`);
    await page.waitForTimeout(1000);

    const svcResult = await page.evaluate(async (data) => {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return { status: res.status, data: await res.json() };
    }, {
      name: `E2E Svc ${ts}`,
      type: "postgresql",
      endpointUrl: "http://localhost:5432",
      host: "localhost",
      port: "5432",
      database: "testdb",
      username: "testuser",
      password: "testpass",
    });

    expect(svcResult.status).toBe(201);
    const serviceId = (svcResult.data as { id: string }).id;
    expect(serviceId).toBeDefined();

    // Step 5: Create app with service assigned
    const appResult = await page.evaluate(
      async ({ data }) => {
        const res = await fetch("/api/apps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return { status: res.status, data: await res.json() };
      },
      {
        data: {
          name: `E2E SvcApp ${ts}`,
          template: "react-spa",
          description: "App with assigned service",
          userId: adminUserId,
          serviceIds: [serviceId],
        },
      }
    );

    expect(appResult.status).toBe(201);
    const appId = (appResult.data as { id: string; name: string }).id;
    expect(appId).toBeDefined();
    expect((appResult.data as { name: string }).name).toBe(
      `E2E SvcApp ${ts}`
    );

    // Step 6: Verify app detail includes the assigned service
    const detailResult = await page.evaluate(async (appId) => {
      const res = await fetch(`/api/apps/${appId}`);
      return { status: res.status, data: await res.json() };
    }, appId);

    expect(detailResult.status).toBe(200);
    const appDetail = detailResult.data as {
      services: {
        serviceId: string;
        envVarPrefix: string;
        service: { type: string; name: string };
      }[];
    };
    expect(appDetail.services).toBeDefined();
    expect(appDetail.services.length).toBe(1);
    expect(appDetail.services[0].serviceId).toBe(serviceId);
    expect(appDetail.services[0].envVarPrefix).toBe("SVC");
    expect(appDetail.services[0].service.type).toBe("postgresql");

    // Step 7: Verify new user appears in user list
    const usersResult = await page.evaluate(async () => {
      const res = await fetch("/api/users");
      return { status: res.status, data: await res.json() };
    });

    expect(usersResult.status).toBe(200);
    const users = usersResult.data as { id: string; name: string }[];
    const found = users.find((u) => u.id === newUserId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("New User");

    // Step 8: Cleanup
    await page.evaluate(async (appId) => {
      await fetch(`/api/apps/${appId}`, { method: "DELETE" });
    }, appId);

    await page.evaluate(async (serviceId) => {
      await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
    }, serviceId);

    await page.evaluate(async (userId) => {
      await fetch(`/api/users/${userId}`, { method: "DELETE" });
    }, newUserId);
  });
});
