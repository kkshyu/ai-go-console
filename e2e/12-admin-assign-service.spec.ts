import { test, expect } from "@playwright/test";

/**
 * Admin flow: create service, create app with service, verify assignment.
 * Uses the authenticated admin session from storageState.
 */
test.describe("Admin: create service and assign to app", () => {
  const ts = Date.now();

  test("create service, assign to app, verify", async ({ request }) => {
    // Get current user session
    const sessionRes = await request.get("/api/auth/session");
    const session = await sessionRes.json();
    const userId = session.user.id;
    expect(userId).toBeDefined();

    // Step 1: Create a PostgreSQL service
    const svcRes = await request.post("/api/services", {
      data: {
        name: `E2E Svc ${ts}`,
        type: "postgresql",
        endpointUrl: "http://localhost:5432",
        host: "localhost",
        port: "5432",
        database: "testdb",
        username: "testuser",
        password: "testpass",
      },
    });
    expect(svcRes.status()).toBe(201);
    const service = await svcRes.json();
    const serviceId = service.id;
    expect(serviceId).toBeDefined();

    // Step 2: Create app with service assigned
    const appRes = await request.post("/api/apps", {
      data: {
        name: `E2E SvcApp ${ts}`,
        template: "react-spa",
        description: "App with assigned service",
        userId,
        serviceIds: [serviceId],
      },
    });
    expect(appRes.status()).toBe(201);
    const app = await appRes.json();
    const appId = app.id;
    expect(appId).toBeDefined();
    expect(app.name).toBe(`E2E SvcApp ${ts}`);

    // Step 3: Verify app detail includes the assigned service
    const detailRes = await request.get(`/api/apps/${appId}`);
    expect(detailRes.status()).toBe(200);
    const appDetail = await detailRes.json();
    expect(appDetail.services).toBeDefined();
    expect(appDetail.services.length).toBe(1);
    expect(appDetail.services[0].serviceId).toBe(serviceId);
    expect(appDetail.services[0].envVarPrefix).toBe("SVC");
    expect(appDetail.services[0].service.type).toBe("postgresql");

    // Step 4: Verify users list
    const usersRes = await request.get("/api/users");
    expect(usersRes.status()).toBe(200);
    const users = await usersRes.json();
    expect(users.length).toBeGreaterThan(0);

    // Cleanup
    await request.delete(`/api/apps/${appId}`);
    await request.delete(`/api/services/${serviceId}`);
  });
});
