import { test, expect } from "@playwright/test";

test.describe("App Generator", () => {
  const ts = Date.now();
  let userId: string;
  const appIds: string[] = [];

  test("setup: get current user", async ({ request }) => {
    const res = await request.get("/api/auth/session");
    const session = await res.json();
    userId = session.user.id;
    expect(userId).toBeDefined();
  });

  test("generates react-spa app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E GR ${ts}`,
        template: "react-spa",
        description: "Generator test",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const app = await res.json();
    appIds.push(app.id);
    expect(app.slug).toBeDefined();
  });

  test("generates node-api app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E GN ${ts}`,
        template: "node-api",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const app = await res.json();
    appIds.push(app.id);
    expect(app.slug).toBeDefined();
  });

  test("generates nextjs-fullstack app", async ({ request }) => {
    expect(userId).toBeDefined();
    const res = await request.post("/api/apps", {
      data: {
        name: `E2E GX ${ts}`,
        template: "nextjs-fullstack",
        userId,
      },
    });
    expect(res.status()).toBe(201);
    const app = await res.json();
    appIds.push(app.id);
    expect(app.slug).toBeDefined();
  });

  test("cleanup", async ({ request }) => {
    for (const id of appIds) {
      await request.delete(`/api/apps/${id}`);
    }
  });
});
