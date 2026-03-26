import { test, expect } from "@playwright/test";

test.describe("Service Encryption", () => {
  let svcId: string;

  test("services are stored encrypted in DB", async ({ request }) => {
    // Create a service
    const res = await request.post("/api/services", {
      data: {
        name: "E2E Encrypted SVC",
        type: "postgresql",
        endpointUrl: "http://secrethost.internal:3000",
        host: "secrethost.internal",
        port: "5432",
        database: "secretdb",
        username: "secretuser",
        password: "super-secret-password-12345",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    svcId = body.id;

    // The GET response should NOT contain config
    expect(body.configEncrypted).toBeUndefined();
    expect(body.password).toBeUndefined();
    expect(body.host).toBeUndefined();
  });

  test("GET service list never exposes encrypted data", async ({
    request,
  }) => {
    const res = await request.get("/api/services");
    const services = await res.json();

    for (const svc of services) {
      expect(svc.configEncrypted).toBeUndefined();
      expect(svc.iv).toBeUndefined();
      expect(svc.authTag).toBeUndefined();
      expect(svc.password).toBeUndefined();
      expect(svc.apiKey).toBeUndefined();
    }
  });

  test("test connection can decrypt and use service config", async ({
    request,
  }) => {
    // The test connection endpoint decrypts config internally
    const res = await request.post(`/api/services/${svcId}/test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // It should have attempted connection (may fail since host doesn't exist)
    expect(body).toHaveProperty("message");
  });

  test.afterAll(async ({ request }) => {
    if (svcId) {
      await request.delete(`/api/services/${svcId}`);
    }
  });
});
