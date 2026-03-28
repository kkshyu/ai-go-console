import { test, expect } from "@playwright/test";

test.describe("App Chat History & Files API", () => {
  const ts = Date.now();
  let appId: string;
  let userId: string;

  test("setup: get current user", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    const session = await res.json();
    userId = session.user.id;
    expect(userId).toBeDefined();
  });

  test("setup: create test app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E ChatFiles ${ts}`,
        template: "react-spa",
        description: "E2E test for chat and files APIs",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    appId = body.id;
    expect(appId).toBeDefined();
  });

  // --- Chat API ---

  test("GET /api/apps/:id/chat returns empty messages for new app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/chat`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.messages)).toBe(true);
    expect(body.messages.length).toBe(0);
  });

  test("POST /api/apps/:id/chat rejects missing fields", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/chat`, {
      data: { content: "hello" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("required");
  });

  test("POST /api/apps/:id/chat creates a user message", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/chat`, {
      data: { role: "user", content: "E2E test message" },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.role).toBe("user");
    expect(body.content).toBe("E2E test message");
    expect(body.appId).toBe(appId);
  });

  test("POST /api/apps/:id/chat creates an assistant message with agentRole", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/chat`, {
      data: {
        role: "assistant",
        content: "E2E assistant reply",
        agentRole: "architect",
        stage: "planning",
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.role).toBe("assistant");
    expect(body.agentRole).toBe("architect");
    expect(body.stage).toBe("planning");
  });

  test("GET /api/apps/:id/chat returns messages in order", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/chat`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.messages.length).toBe(2);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toBe("E2E test message");
    expect(body.messages[1].role).toBe("assistant");
    expect(body.messages[1].agentRole).toBe("architect");
    // Verify chronological order
    const t0 = new Date(body.messages[0].createdAt).getTime();
    const t1 = new Date(body.messages[1].createdAt).getTime();
    expect(t1).toBeGreaterThanOrEqual(t0);
  });

  // --- Files API ---
  // Note: Files endpoints require a running sandbox container.
  // These tests verify the API returns proper errors when no container exists.

  test("GET /api/apps/:id/files returns 404 when no container", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files`);
    // Without a running container, expect 404 or 500
    expect([404, 500]).toContain(res.status());
  });

  test("POST /api/apps/:id/files rejects empty files array", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.post(`/api/apps/${appId}/files`, {
      headers: { "content-type": "application/json" },
      data: { files: [] },
    });
    // Either 400 (validation) or 404 (no container) is acceptable
    expect(res.status()).toBeGreaterThanOrEqual(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("GET /api/apps/:id/files rejects path traversal", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files?path=../../etc/passwd&content=true`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("Invalid path");
  });

  test("GET /api/apps/:id/files/content requires path param", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files/content`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  test("GET /api/apps/:id/files/content rejects path traversal", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files/content?path=../../../etc/passwd`);
    expect(res.status()).toBe(400);
  });

  // --- Chat on invalid app ---

  test("GET /api/apps/nonexistent/chat returns error", async ({ request }) => {
    const res = await request.get("/api/apps/nonexistent-id-12345/chat");
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test("POST /api/apps/nonexistent/chat returns error", async ({ request }) => {
    const res = await request.post("/api/apps/nonexistent-id-12345/chat", {
      data: { role: "user", content: "test" },
    });
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  // --- Cleanup ---

  test("cleanup: delete test app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.delete(`/api/apps/${appId}`);
    expect(res.status()).toBe(200);
  });

  test("cleanup: verify chat gone with app", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/chat`);
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});
