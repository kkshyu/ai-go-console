import { test, expect } from "@playwright/test";

test.describe("App Chat History & Files API", () => {
  let appId: string;

  test("setup: find seeded app", async ({ request }) => {
    const res = await request.get("/api/apps");
    if (res.status() !== 200) {
      test.skip(true, `GET /api/apps returned ${res.status()} — DB may be unavailable`);
      return;
    }
    const apps = await res.json();
    const seededApp = apps.find((a: { name: string }) => a.name === "E-Commerce Demo");
    if (!seededApp) {
      test.skip(true, "Seeded app 'E-Commerce Demo' not found — run prisma db seed first");
      return;
    }
    appId = seededApp.id;
  });

  // --- Chat API ---

  test("GET /api/apps/:id/chat returns messages array", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/chat`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.messages).toBeDefined();
    expect(Array.isArray(body.messages)).toBe(true);
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

  test("GET /api/apps/:id/chat returns messages including new ones", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/chat`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // The seeded app may already have messages; verify our new ones are present
    expect(body.messages.length).toBeGreaterThanOrEqual(2);
    const userMsg = body.messages.find(
      (m: { role: string; content: string }) => m.role === "user" && m.content === "E2E test message"
    );
    const assistantMsg = body.messages.find(
      (m: { role: string; agentRole: string }) => m.role === "assistant" && m.agentRole === "architect"
    );
    expect(userMsg).toBeDefined();
    expect(assistantMsg).toBeDefined();
    // Verify chronological order of our two messages
    const t0 = new Date(userMsg.createdAt).getTime();
    const t1 = new Date(assistantMsg.createdAt).getTime();
    expect(t1).toBeGreaterThanOrEqual(t0);
  });

  // --- Files API ---
  // Note: Files endpoints require a running sandbox container (Docker/k8s).
  // These tests verify the API returns proper responses — either success or
  // expected errors when no container exists.

  test("GET /api/apps/:id/files returns file list or container-not-found", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files`);
    // Without a running container, expect 404 or 500; with one, 200
    expect([200, 404, 500]).toContain(res.status());
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
    // 400 (validation), 404 (no container), or 500 (Docker unavailable)
    expect([400, 404, 500]).toContain(res.status());
  });

  test("GET /api/apps/:id/files/content requires path param", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files/content`);
    // 400 if path validation runs first, 404/500 if container check runs first
    expect([400, 404, 500]).toContain(res.status());
  });

  test("GET /api/apps/:id/files/content rejects path traversal", async ({ request }) => {
    expect(appId).toBeDefined();
    const res = await request.get(`/api/apps/${appId}/files/content?path=../../../etc/passwd`);
    expect([400, 404, 500]).toContain(res.status());
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
});
