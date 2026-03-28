import { test, expect } from "@playwright/test";

test.describe("Organization Domains", () => {
  const ts = Date.now();
  let orgId: string;
  let domainId: string;
  const testDomain = `e2e-${ts}.example.com`;

  test("setup: get current user org", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    expect(res.status()).toBe(200);
    const session = await res.json();
    orgId = session.user.organizationId;
    expect(orgId).toBeDefined();
  });

  test("GET domains returns array", async ({ request }) => {
    expect(orgId).toBeDefined();
    const res = await request.get(`/api/organizations/${orgId}/domains`);
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
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
    const found = body.find((d: { id: string }) => d.id === domainId);
    expect(found).toBeDefined();
  });

  test("DELETE domains removes domain", async ({ request }) => {
    expect(orgId).toBeDefined();
    expect(domainId).toBeDefined();
    const res = await request.delete(`/api/organizations/${orgId}/domains`, {
      data: { domainId },
    });
    expect(res.status()).toBe(200);
    const getRes = await request.get(`/api/organizations/${orgId}/domains`);
    const body = await getRes.json();
    const found = body.find((d: { id: string }) => d.id === domainId);
    expect(found).toBeUndefined();
  });
});
