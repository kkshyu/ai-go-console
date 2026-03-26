import { test, expect } from "@playwright/test";

test.describe("App Domains", () => {
  const ts = Date.now();
  let appId: string;
  let domainId: string;
  const testDomain = `e2e-${ts}.example.com`;

  test("setup: create user and app", async ({ request }) => {
    const userRes = await request.post("/api/auth/register", {
      data: {
        email: `dom-${ts}@test.com`,
        password: "Test1234!",
        name: "Domain User",
      },
    });
    expect(userRes.status()).toBe(201);
    const user = await userRes.json();

    const appRes = await request.post("/api/apps", {
      data: {
        name: `E2E Dom ${ts}`,
        template: "react-spa",
        userId: user.id,
      },
    });
    expect(appRes.status()).toBe(201);
    const app = await appRes.json();
    appId = app.id;
  });

  test("GET domains returns empty array", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/domains`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test("POST domains adds a domain", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/domains`, {
      data: { domain: testDomain },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.domain).toBe(testDomain);
    expect(body.isActive).toBe(true);
    domainId = body.id;
  });

  test("POST domains rejects duplicate", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/domains`, {
      data: { domain: testDomain },
    });
    expect(res.status()).toBe(409);
  });

  test("POST domains rejects empty", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/domains`, {
      data: { domain: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET domains lists added domain", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/domains`);
    const body = await res.json();
    expect(body.length).toBe(1);
    expect(body[0].id).toBe(domainId);
  });

  test("DELETE domains removes domain", async ({ request }) => {
    expect(appId).toBeDefined();
    expect(domainId).toBeDefined();
    const res = await request.delete(`/api/apps/${appId}/domains`, {
      data: { domainId },
    });
    expect(res.status()).toBe(200);
    const getRes = await request.get(`/api/apps/${appId}/domains`);
    expect((await getRes.json()).length).toBe(0);
  });

  test("cleanup", async ({ request }) => {
    if (appId) await request.delete(`/api/apps/${appId}`);
  });
});
