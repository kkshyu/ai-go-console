import { test, expect } from "@playwright/test";

/**
 * Integration tests for all service categories.
 * Verifies CRUD + test-connection for every service type across all categories.
 */

interface ServiceTestCase {
  type: string;
  category: string;
  name: string;
  config: Record<string, string>;
}

const serviceTestCases: ServiceTestCase[] = [
  // --- database ---
  {
    type: "postgresql",
    category: "database",
    name: "E2E PostgreSQL",
    config: {
      endpointUrl: "http://localhost:3000/rest",
      host: "localhost",
      port: "5432",
      database: "testdb",
      username: "testuser",
      password: "testpass",
    },
  },
  {
    type: "mysql",
    category: "database",
    name: "E2E MySQL",
    config: {
      endpointUrl: "http://localhost:3306/api",
      host: "localhost",
      port: "3306",
      database: "testdb",
      username: "root",
      password: "testpass",
    },
  },
  {
    type: "mongodb",
    category: "database",
    name: "E2E MongoDB",
    config: {
      endpointUrl: "http://localhost:27017",
      connectionString: "mongodb://localhost:27017/testdb",
    },
  },
  // --- storage ---
  {
    type: "s3",
    category: "storage",
    name: "E2E S3",
    config: {
      endpointUrl: "http://localhost:9000",
      accessKeyId: "minioadmin",
      secretAccessKey: "minioadmin",
      bucket: "test-bucket",
      region: "us-east-1",
    },
  },
  {
    type: "gcs",
    category: "storage",
    name: "E2E GCS",
    config: {
      projectId: "test-project",
      clientEmail: "test@test.iam.gserviceaccount.com",
      privateKey: "fake-private-key",
      bucket: "test-bucket",
    },
  },
  {
    type: "azure_blob",
    category: "storage",
    name: "E2E Azure Blob",
    config: {
      accountName: "testaccount",
      accountKey: "dGVzdGtleQ==",
      containerName: "test-container",
    },
  },
  {
    type: "google_drive",
    category: "storage",
    name: "E2E Google Drive",
    config: {
      clientId: "fake-client-id.apps.googleusercontent.com",
      clientSecret: "fake-client-secret",
      refreshToken: "fake-refresh-token",
      folderId: "fake-folder-id",
    },
  },
  // --- payment ---
  {
    type: "stripe",
    category: "payment",
    name: "E2E Stripe",
    config: {
      apiKey: "sk_test_fake",
      webhookSecret: "whsec_fake",
    },
  },
  {
    type: "paypal",
    category: "payment",
    name: "E2E PayPal",
    config: {
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      mode: "sandbox",
    },
  },
  {
    type: "ecpay",
    category: "payment",
    name: "E2E ECPay",
    config: {
      merchantId: "2000132",
      hashKey: "5294y06JbISpM5x9",
      hashIV: "v77hoKGq4kWxNNIS",
    },
  },
  // --- email ---
  {
    type: "sendgrid",
    category: "email",
    name: "E2E SendGrid",
    config: {
      apiKey: "SG.fake-key",
      fromEmail: "test@example.com",
    },
  },
  {
    type: "ses",
    category: "email",
    name: "E2E SES",
    config: {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG",
      region: "us-east-1",
      fromEmail: "test@example.com",
    },
  },
  {
    type: "mailgun",
    category: "email",
    name: "E2E Mailgun",
    config: {
      apiKey: "key-fake",
      domain: "mg.example.com",
      fromEmail: "test@example.com",
    },
  },
  // --- sms ---
  {
    type: "twilio",
    category: "sms",
    name: "E2E Twilio",
    config: {
      accountSid: "ACfake",
      authToken: "fake-token",
      fromNumber: "+15551234567",
    },
  },
  {
    type: "vonage",
    category: "sms",
    name: "E2E Vonage",
    config: {
      apiKey: "fake-api-key",
      apiSecret: "fake-api-secret",
      fromNumber: "+15551234567",
    },
  },
  {
    type: "aws_sns",
    category: "sms",
    name: "E2E AWS SNS",
    config: {
      accessKeyId: "AKIAIOSFODNN7EXAMPLE",
      secretAccessKey: "wJalrXUtnFEMI/K7MDENG",
      region: "us-east-1",
    },
  },
  // --- auth ---
  {
    type: "auth0",
    category: "auth",
    name: "E2E Auth0",
    config: {
      domain: "fake-tenant.auth0.com",
      clientId: "fake-client-id",
      clientSecret: "fake-client-secret",
    },
  },
  {
    type: "firebase_auth",
    category: "auth",
    name: "E2E Firebase Auth",
    config: {
      projectId: "fake-project",
      apiKey: "AIzaSyFake",
      authDomain: "fake-project.firebaseapp.com",
    },
  },
  {
    type: "line_login",
    category: "auth",
    name: "E2E LINE Login",
    config: {
      channelId: "1234567890",
      channelSecret: "fake-channel-secret",
      callbackUrl: "https://example.com/callback",
    },
  },
  // --- platform ---
  {
    type: "supabase",
    category: "platform",
    name: "E2E Supabase",
    config: {
      endpointUrl: "https://fake.supabase.co",
      projectUrl: "https://fake.supabase.co",
      apiKey: "fake-anon-key",
    },
  },
  {
    type: "hasura",
    category: "platform",
    name: "E2E Hasura",
    config: {
      endpointUrl: "http://localhost:8080",
      adminSecret: "fake-admin-secret",
    },
  },
];

test.describe("Service Categories - CRUD for all types", () => {
  const createdIds: Record<string, string> = {};

  for (const tc of serviceTestCases) {
    test(`POST /api/services creates ${tc.type} (${tc.category})`, async ({
      request,
    }) => {
      const res = await request.post("/api/services", {
        data: {
          name: tc.name,
          type: tc.type,
          ...tc.config,
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.type).toBe(tc.type);
      expect(body.name).toBe(tc.name);
      expect(body.id).toBeDefined();
      createdIds[tc.type] = body.id;
    });
  }

  test("GET /api/services lists all created services", async ({ request }) => {
    const res = await request.get("/api/services");
    expect(res.status()).toBe(200);
    const body = await res.json();

    const createdTypes = new Set(serviceTestCases.map((tc) => tc.type));
    const returnedTypes = new Set(
      body
        .filter((s: { name: string }) => s.name.startsWith("E2E "))
        .map((s: { type: string }) => s.type)
    );

    for (const t of createdTypes) {
      expect(returnedTypes.has(t)).toBe(true);
    }

    // Encrypted config must never be exposed
    for (const svc of body) {
      expect(svc.configEncrypted).toBeUndefined();
      expect(svc.iv).toBeUndefined();
      expect(svc.authTag).toBeUndefined();
    }
  });

  test("GET /api/services/:id returns individual service", async ({
    request,
  }) => {
    // Pick the first created service
    const firstType = serviceTestCases[0].type;
    const id = createdIds[firstType];
    if (!id) return;

    const res = await request.get(`/api/services/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.type).toBe(firstType);
  });

  test("PATCH /api/services/:id updates a service", async ({ request }) => {
    const id = createdIds["postgresql"];
    if (!id) return;

    const res = await request.patch(`/api/services/${id}`, {
      data: { name: "E2E PostgreSQL Updated" },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("E2E PostgreSQL Updated");
  });
});

test.describe("Service Categories - Connection test for all types", () => {
  const createdIds: Record<string, string> = {};

  // Create services first so we can test connections
  for (const tc of serviceTestCases) {
    test(`setup: create ${tc.type} for connection test`, async ({
      request,
    }) => {
      const res = await request.post("/api/services", {
        data: {
          name: `ConnTest ${tc.name}`,
          type: tc.type,
          ...tc.config,
        },
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      createdIds[tc.type] = body.id;
    });
  }

  for (const tc of serviceTestCases) {
    test(`POST /api/services/:id/test returns result for ${tc.type} (${tc.category})`, async ({
      request,
    }) => {
      const id = createdIds[tc.type];
      if (!id) return;

      const res = await request.post(`/api/services/${id}/test`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      // Every tester should return success + message
      expect(body).toHaveProperty("success");
      expect(body).toHaveProperty("message");
      expect(typeof body.success).toBe("boolean");
      expect(typeof body.message).toBe("string");
    });
  }
});

test.describe("Service Categories - Cleanup", () => {
  test("DELETE all E2E test services", async ({ request }) => {
    const listRes = await request.get("/api/services");
    const services = await listRes.json();

    const e2eServices = services.filter((s: { name: string }) =>
      s.name.startsWith("E2E ") || s.name.startsWith("ConnTest ")
    );

    for (const svc of e2eServices) {
      const delRes = await request.delete(`/api/services/${svc.id}`);
      expect(delRes.status()).toBe(200);
    }

    // Verify cleanup
    const afterRes = await request.get("/api/services");
    const afterServices = await afterRes.json();
    const remaining = afterServices.filter((s: { name: string }) =>
      s.name.startsWith("E2E ") || s.name.startsWith("ConnTest ")
    );
    expect(remaining.length).toBe(0);
  });
});

test.describe("Service Categories - Validation", () => {
  test("POST /api/services rejects missing name", async ({ request }) => {
    const res = await request.post("/api/services", {
      data: { type: "mysql" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/services rejects missing type", async ({ request }) => {
    const res = await request.post("/api/services", {
      data: { name: "No Type Service" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/services/:id/test returns 404 for non-existent service", async ({
    request,
  }) => {
    const res = await request.post("/api/services/nonexistent-id/test");
    expect(res.status()).toBe(404);
  });
});

// OrgAllowedService has been removed — service authorization is now per-user via UserAllowedServiceInstance.

test.describe("Service Categories - UI", () => {
  /** Helper: open add form and select category + type via two-step selects */
  async function openFormAndSelectType(
    page: import("@playwright/test").Page,
    category: string,
    type: string
  ) {
    await page.goto("/services");
    await page.click(
      "button:has-text('Add Service'), button:has-text('新增服務')"
    );
    // Step 1: select category
    const categorySelect = page.locator("select").first();
    await categorySelect.selectOption(category);
    // Step 2: select type (second select appears after category)
    const typeSelect = page.locator("select").nth(1);
    await typeSelect.selectOption(type);
  }

  test("services page form shows category select on Add", async ({
    page,
  }) => {
    await page.goto("/services");
    // Wait for page to load fully
    await page.waitForLoadState("networkidle");
    await page.click(
      "button:has-text('Add Service'), button:has-text('新增服務')"
    );
    // Category select should appear
    const categorySelect = page.locator("select").first();
    await expect(categorySelect).toBeVisible();
    // Wait a moment for React state to populate the select options
    await page.waitForTimeout(500);
    const options = categorySelect.locator("option");
    const count = await options.count();
    // At least the placeholder + a few categories
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("services page form shows dynamic fields for mysql type", async ({
    page,
  }) => {
    await openFormAndSelectType(page, "database", "mysql");

    // Should show MySQL-specific fields
    await expect(
      page.locator('input[placeholder="localhost"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="3306"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="mydb"]')
    ).toBeVisible();
  });

  test("services page form shows dynamic fields for twilio type", async ({
    page,
  }) => {
    await openFormAndSelectType(page, "sms", "twilio");

    // Should show Twilio-specific fields
    await expect(
      page.locator('input[placeholder="ACxxxxx"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="+15551234567"]')
    ).toBeVisible();
  });

  test("services page form shows dynamic fields for auth0 type", async ({
    page,
  }) => {
    await openFormAndSelectType(page, "auth", "auth0");

    // Should show Auth0-specific fields
    await expect(
      page.locator('input[placeholder="my-tenant.auth0.com"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="your-client-id"]')
    ).toBeVisible();
  });

  test("services page form changes fields when type changes", async ({
    page,
  }) => {
    // Select database > postgresql first
    await openFormAndSelectType(page, "database", "postgresql");

    await expect(
      page.locator('input[placeholder="5432"]')
    ).toBeVisible();

    // Switch to email > sendgrid
    const categorySelect = page.locator("select").first();
    await categorySelect.selectOption("email");
    const typeSelect = page.locator("select").nth(1);
    await typeSelect.selectOption("sendgrid");

    // PostgreSQL fields should be gone, SendGrid fields visible
    await expect(
      page.locator('input[placeholder="5432"]')
    ).not.toBeVisible();
    await expect(
      page.locator('input[placeholder="SG.xxxxx"]')
    ).toBeVisible();
    await expect(
      page.locator('input[placeholder="noreply@example.com"]')
    ).toBeVisible();
  });
});
