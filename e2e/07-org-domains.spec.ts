import { test, expect } from "@playwright/test";

test.describe("Organization Domains", () => {
  const ts = Date.now();
  let orgId: string;
  let domainId: string;
  const testDomain = `e2e-${ts}.example.com`;

  test("setup: create user and get org", async ({ request }) => {
    const userRes = await request.post("/api/auth/register", {
      data: {
        email: `orgdom-${ts}@test.com`,
        password: "Test1234!",
        name: "OrgDomain User",
      },
    });
    expect(userRes.status()).toBe(201);
    const user = await userRes.json();
    orgId = user.organizationId;
  });

  test("GET domains returns empty array", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.get(`/api/organizations/${orgId}/domains`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("POST domains adds a domain", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.post(`/api/organizations/${orgId}/domains`, {
      data: { domain: testDomain },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.domain).toBe(testDomain);
    expect(body.isActive).toBe(true);
    expect(body.organizationId).toBe(orgId);
    domainId = body.id;
  });

  test("POST domains rejects duplicate", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.post(`/api/organizations/${orgId}/domains`, {
      data: { domain: testDomain },
    });
    expect(res.status()).toBe(409);
  });

  test("POST domains rejects empty", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.post(`/api/organizations/${orgId}/domains`, {
      data: { domain: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET domains lists added domain", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.get(`/api/organizations/${orgId}/domains`);
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(domainId);
  });

  test("DELETE domains removes domain", async ({ request }) => {
    expect(orgId).toBeDefined();
    expect(domainId).toBeDefined();
    const res = await request.delete(`/api/organizations/${orgId}/domains`, {
      data: { domainId },
    });
    expect(res.status()).toBe(200);
    const getRes = await request.get(`/api/organizations/${orgId}/domains`);
    expect((await getRes.json()).length).toBe(0);
  });
});
