import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const APPS_DIR = path.join(process.cwd(), "apps");

test.describe("App Generator", () => {
  const ts = Date.now();
  let userId: string;
  const appIds: string[] = [];

  test("setup: create user", async ({ request }) => {
    const userRes = await request.post("/api/auth/register", {
      data: {
        email: `gen-${ts}@test.com`,
        password: "Test1234!",
        name: "Gen User",
      },
    });
    expect(userRes.status()).toBe(201);
    userId = (await userRes.json()).id;
  });

  test("generates react-spa app files", async ({ request }) => {
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

    const appDir = path.join(APPS_DIR, app.slug);
    expect(fs.existsSync(appDir)).toBe(true);
    expect(fs.existsSync(path.join(appDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "vite.config.ts"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "Dockerfile"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "src", "App.tsx"))).toBe(true);

    const pkg = JSON.parse(
      fs.readFileSync(path.join(appDir, "package.json"), "utf-8")
    );
    expect(pkg.name).toBe(app.slug);
  });

  test("generates node-api app files", async ({ request }) => {
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
    expect(fs.existsSync(path.join(appDir, "Dockerfile"))).toBe(true);
    expect(fs.existsSync(path.join(appDir, "src", "index.ts"))).toBe(true);
  });

  test("generates nextjs-fullstack app files", async ({ request }) => {
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
    expect(fs.existsSync(path.join(appDir, "Dockerfile"))).toBe(true);
    expect(
      fs.existsSync(path.join(appDir, "src", "app", "page.tsx"))
    ).toBe(true);
  });

  test("generates docker-compose.yml with port", async ({ request }) => {
    if (appIds.length === 0) return;
    const appRes = await request.get(`/api/apps/${appIds[0]}`);
    const app = await appRes.json();

    const composePath = path.join(APPS_DIR, app.slug, "docker-compose.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const content = fs.readFileSync(composePath, "utf-8");
    expect(content).toContain(app.slug);
    expect(content).toContain(String(app.port));
  });

  test("cleanup", async ({ request }) => {
    for (const id of appIds) {
      await request.delete(`/api/apps/${id}`);
    }
  });
});
