import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const APPS_DIR = path.join(process.cwd(), "apps");

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

  test("generates react-spa app with metadata", async ({ request }) => {
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

    // Host metadata directory should exist with docker-compose.yml
    const appDir = path.join(APPS_DIR, app.slug);
    expect(fs.existsSync(appDir)).toBe(true);
    expect(fs.existsSync(path.join(appDir, "docker-compose.yml"))).toBe(true);
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

    const appDir = path.join(APPS_DIR, app.slug);
    expect(fs.existsSync(path.join(appDir, "docker-compose.yml"))).toBe(true);
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

    const appDir = path.join(APPS_DIR, app.slug);
    expect(fs.existsSync(path.join(appDir, "docker-compose.yml"))).toBe(true);
  });

  test("docker-compose.yml contains app slug and port", async ({ request }) => {
    if (appIds.length === 0) return;
    const appRes = await request.get(`/api/apps/${appIds[0]}`);
    const app = await appRes.json();

    const composePath = path.join(APPS_DIR, app.slug, "docker-compose.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, "utf-8");
    expect(content).toContain(app.slug);
    // Port mapping is present in docker-compose (format: "XXXX:80")
    expect(content).toMatch(/ports:/);
    expect(content).toMatch(/\d+:80/);
  });

  test("cleanup", async ({ request }) => {
    for (const id of appIds) {
      await request.delete(`/api/apps/${id}`);
    }
  });
});
