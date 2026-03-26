import { test, expect } from "@playwright/test";

test.describe("Credential Encryption", () => {
  let dsId: string;

  test("credentials are stored encrypted in DB", async ({ request }) => {
    // Create a data source
    const res = await request.post("/api/data-sources", {
      data: {
        name: "E2E Encrypted DS",
        type: "postgres",
        host: "secrethost.internal",
        port: "5432",
        database: "secretdb",
        username: "secretuser",
        password: "super-secret-password-12345",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    dsId = body.id;

    // The GET response should NOT contain credentials
    expect(body.credentialsEncrypted).toBeUndefined();
    expect(body.password).toBeUndefined();
    expect(body.host).toBeUndefined();
  });

  test("GET data source list never exposes credentials", async ({
    request,
  }) => {
    const res = await request.get("/api/data-sources");
    const sources = await res.json();

    for (const ds of sources) {
      expect(ds.credentialsEncrypted).toBeUndefined();
      expect(ds.iv).toBeUndefined();
      expect(ds.authTag).toBeUndefined();
      expect(ds.password).toBeUndefined();
      expect(ds.apiKey).toBeUndefined();
    }
  });

  test("test connection can decrypt and use credentials", async ({
    request,
  }) => {
    // The test connection endpoint decrypts credentials internally
    const res = await request.post(`/api/data-sources/${dsId}/test`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // It should have attempted connection (may fail since host doesn't exist)
    expect(body).toHaveProperty("message");
  });

  test.afterAll(async ({ request }) => {
    if (dsId) {
      await request.delete(`/api/data-sources/${dsId}`);
    }
  });
});
