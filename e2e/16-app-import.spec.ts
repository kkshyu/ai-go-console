import { test, expect, APIRequestContext } from "@playwright/test";

/** Helper to upload files via the import/upload endpoint. */
async function uploadFiles(
  request: APIRequestContext,
  files: Array<{ name: string; mimeType: string; content: string }>,
  paths: string[]
) {
  const multipart: Record<string, unknown> =
    files.length === 1
      ? {
          files: {
            name: files[0].name,
            mimeType: files[0].mimeType,
            buffer: Buffer.from(files[0].content),
          },
          paths: paths[0],
        }
      : {
          files: files.map((f) => ({
            name: f.name,
            mimeType: f.mimeType,
            buffer: Buffer.from(f.content),
          })),
          paths,
        };
  return request.post("/api/apps/import/upload", { multipart });
}

test.describe("App Import Flow", () => {
  test.describe("POST /api/apps/import/upload", () => {
    test("returns 400 when no files are provided", async ({ request }) => {
      // Send multipart with a dummy field but no "files" field
      const res = await request.post("/api/apps/import/upload", {
        multipart: { _empty: "1" },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("No files");
    });

    test("uploads a single file and returns importSessionId", async ({
      request,
    }) => {
      const res = await uploadFiles(
        request,
        [
          {
            name: "package.json",
            mimeType: "application/json",
            content: JSON.stringify({
              name: "e2e-import-test",
              version: "1.0.0",
              dependencies: { next: "14.0.0", react: "18.0.0" },
            }),
          },
        ],
        ["package.json"]
      );

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.importSessionId).toBeDefined();
      expect(typeof body.importSessionId).toBe("string");
      expect(body.fileCount).toBe(1);
      expect(body.skippedCount).toBe(0);
    });

    test("uploads multiple files", async ({ request }) => {
      const res = await uploadFiles(
        request,
        [
          {
            name: "package.json",
            mimeType: "application/json",
            content: JSON.stringify({
              name: "e2e-multi-upload",
              dependencies: { express: "4.18.0" },
            }),
          },
          {
            name: "index.ts",
            mimeType: "text/plain",
            content:
              'import express from "express";\nconst app = express();',
          },
        ],
        ["package.json", "src/index.ts"]
      );

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.fileCount).toBe(2);
      expect(body.skippedCount).toBe(0);
      expect(body.importSessionId).toBeDefined();
    });

    test("skips empty files", async ({ request }) => {
      const res = await uploadFiles(
        request,
        [
          { name: "empty.txt", mimeType: "text/plain", content: "" },
          { name: "valid.txt", mimeType: "text/plain", content: "some content" },
        ],
        ["empty.txt", "valid.txt"]
      );

      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.fileCount).toBe(1);
      expect(body.skippedCount).toBe(1);
    });
  });

  test.describe("GET /api/apps/import/status", () => {
    test("returns 400 when sessionId is missing", async ({ request }) => {
      const res = await request.get("/api/apps/import/status");
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("sessionId");
    });

    test("returns 404 for non-existent session", async ({ request }) => {
      const res = await request.get(
        "/api/apps/import/status?sessionId=00000000-0000-0000-0000-000000000000"
      );
      expect(res.status()).toBe(404);
    });

    test("returns progress for a valid import session", async ({
      request,
    }) => {
      const uploadRes = await uploadFiles(
        request,
        [
          {
            name: "status-test.txt",
            mimeType: "text/plain",
            content: "E2E status check content",
          },
        ],
        ["status-test.txt"]
      );
      const { importSessionId: sessionId } = await uploadRes.json();

      const statusRes = await request.get(
        `/api/apps/import/status?sessionId=${sessionId}`
      );
      expect(statusRes.status()).toBe(200);

      const body = await statusRes.json();
      expect(body.total).toBeGreaterThanOrEqual(1);
      expect(typeof body.uploaded).toBe("number");
      expect(typeof body.processing).toBe("number");
      expect(typeof body.ready).toBe("number");
      expect(typeof body.error).toBe("number");
      expect(body.total).toBe(
        body.uploaded + body.processing + body.ready + body.error
      );
    });
  });

  test.describe("POST /api/apps/import/analyze", () => {
    test("returns 400 when importSessionId is missing", async ({
      request,
    }) => {
      const res = await request.post("/api/apps/import/analyze", {
        data: {},
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("importSessionId");
    });

    test("returns 404 for session with no files", async ({ request }) => {
      const res = await request.post("/api/apps/import/analyze", {
        data: {
          importSessionId: "00000000-0000-0000-0000-000000000000",
        },
      });
      expect(res.status()).toBe(404);
    });

    test("analyzes uploaded files and returns app metadata", async ({
      request,
    }) => {
      const uploadRes = await uploadFiles(
        request,
        [
          {
            name: "package.json",
            mimeType: "application/json",
            content: JSON.stringify({
              name: "e2e-analyze-test",
              version: "1.0.0",
              dependencies: {
                next: "14.0.0",
                react: "18.2.0",
                "react-dom": "18.2.0",
                prisma: "5.0.0",
              },
              devDependencies: { typescript: "5.0.0" },
            }),
          },
        ],
        ["package.json"]
      );
      const { importSessionId: sessionId } = await uploadRes.json();

      // Brief wait for background file processing to extract text
      await new Promise((r) => setTimeout(r, 2000));

      const analyzeRes = await request.post("/api/apps/import/analyze", {
        data: { importSessionId: sessionId },
      });

      // Analyze depends on LLM availability; accept 200 or 500
      if (analyzeRes.status() === 200) {
        const body = await analyzeRes.json();
        expect(body.name).toBeDefined();
        expect(body.slug).toBeDefined();
        expect(body.template).toBeDefined();
        expect(typeof body.description).toBe("string");
        expect(Array.isArray(body.requiredServices)).toBe(true);
      } else {
        // LLM or embedding service may be unavailable in CI
        expect([500, 429]).toContain(analyzeRes.status());
      }
    });
  });

  test.describe("POST /api/apps/import/autostart", () => {
    test("returns 400 when appId is missing", async ({ request }) => {
      const res = await request.post("/api/apps/import/autostart", {
        data: {},
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("appId");
    });

    test("returns 404 for non-existent app", async ({ request }) => {
      const res = await request.post("/api/apps/import/autostart", {
        data: { appId: "non-existent-app-id" },
      });
      expect(res.status()).toBe(404);
    });

    test("returns SSE stream for a valid app", async ({ request }) => {
      const sessionRes = await request.get("/api/auth/session");
      const session = await sessionRes.json();
      const userId = session.user?.id;
      if (!userId) {
        test.skip();
        return;
      }

      const ts = Date.now();
      const createRes = await request.post("/api/apps", {
        data: {
          name: `E2E Autostart ${ts}`,
          template: "nextjs-fullstack",
          description: "E2E autostart test",
          userId,
        },
      });

      if (createRes.status() !== 201) {
        test.skip();
        return;
      }

      const app = await createRes.json();

      const autostartRes = await request.post("/api/apps/import/autostart", {
        data: { appId: app.id },
      });

      expect(autostartRes.status()).toBe(200);
      const contentType = autostartRes.headers()["content-type"];
      expect(contentType).toContain("text/event-stream");

      // Clean up
      await request.delete(`/api/apps/${app.id}`);
    });
  });

  test.describe("Import flow integration", () => {
    test("upload -> status returns consistent data", async ({ request }) => {
      const uploadRes = await uploadFiles(
        request,
        [
          {
            name: "package.json",
            mimeType: "application/json",
            content: JSON.stringify({
              name: "e2e-flow-test",
              dependencies: { next: "14.0.0" },
            }),
          },
        ],
        ["package.json"]
      );
      expect(uploadRes.status()).toBe(200);
      const { importSessionId: sid, fileCount } = await uploadRes.json();
      expect(fileCount).toBe(1);

      const statusRes = await request.get(
        `/api/apps/import/status?sessionId=${sid}`
      );
      expect(statusRes.status()).toBe(200);
      const status = await statusRes.json();
      expect(status.total).toBe(1);
    });
  });
});
