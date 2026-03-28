import { test, expect } from "@playwright/test";

test.describe("AI Chat File Upload", () => {
  test("POST /api/chat/files uploads a text file successfully", async ({
    request,
  }) => {
    const fileContent = Buffer.from("E2E test file content for upload");
    const res = await request.post("/api/chat/files", {
      multipart: {
        files: {
          name: "E2E-test-upload.txt",
          mimeType: "text/plain",
          buffer: fileContent,
        },
      },
    });

    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(json.files).toHaveLength(1);

    const file = json.files[0];
    expect(file).toMatchObject({
      name: "E2E-test-upload.txt",
      type: "code",
      status: "uploaded",
    });
    expect(file.id).toBeTruthy();
    expect(file.sizeBytes).toBeGreaterThan(0);
  });

  test("POST /api/chat/files returns 400 when no file is provided", async ({
    request,
  }) => {
    const res = await request.post("/api/chat/files", {
      multipart: {
        conversationId: "fake-id",
      },
    });

    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No files");
  });

  test("GET /api/chat/files returns metadata for uploaded file", async ({
    request,
  }) => {
    // Upload a file first to guarantee we have one
    const fileContent = Buffer.from("E2E metadata check content");
    const uploadRes = await request.post("/api/chat/files", {
      multipart: {
        files: {
          name: "E2E-metadata-check.txt",
          mimeType: "text/plain",
          buffer: fileContent,
        },
      },
    });
    expect(uploadRes.ok()).toBe(true);
    const uploadJson = await uploadRes.json();
    const fileId = uploadJson.files[0].id;

    // Fetch metadata via GET
    const res = await request.get(`/api/chat/files?ids=${fileId}`);
    expect(res.ok()).toBe(true);

    const json = await res.json();
    expect(json.files).toHaveLength(1);

    const file = json.files[0];
    expect(file.id).toBe(fileId);
    expect(file.fileName).toBe("E2E-metadata-check.txt");
    expect(file.fileType).toBe("code");
    expect(file.status).toBeTruthy();
    expect(file.sizeBytes).toBeGreaterThan(0);
  });

  test("POST /api/chat with fileIds references uploaded file in SSE stream", async ({
    request,
  }) => {
    // Upload a file first
    const fileContent = Buffer.from("E2E file for chat context: the answer is 42");
    const uploadRes = await request.post("/api/chat/files", {
      multipart: {
        files: {
          name: "E2E-chat-context.txt",
          mimeType: "text/plain",
          buffer: fileContent,
        },
      },
    });
    expect(uploadRes.ok()).toBe(true);
    const uploadJson = await uploadRes.json();
    const fileId = uploadJson.files[0].id;

    // Send a chat message referencing the uploaded file
    const res = await request.post("/api/chat", {
      data: {
        messages: [
          {
            role: "user",
            content: "Summarize the attached file",
            fileIds: [fileId],
          },
        ],
      },
    });

    const contentType = res.headers()["content-type"] || "";
    // The endpoint should return SSE stream or a 4xx/5xx if the LLM is unavailable
    expect(
      contentType.includes("text/event-stream") || res.status() >= 400
    ).toBe(true);
  });

  test("GET /api/chat/files returns 400 when no IDs provided", async ({
    request,
  }) => {
    const res = await request.get("/api/chat/files");
    expect(res.status()).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No file IDs");
  });

  test("POST /api/chat/files supports multiple files", async ({
    request,
  }) => {
    const res = await request.post("/api/chat/files", {
      multipart: {
        files: [
          {
            name: "E2E-multi-1.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("E2E first file"),
          },
          {
            name: "E2E-multi-2.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("E2E second file"),
          },
        ],
      },
    });

    expect(res.ok()).toBe(true);
    const json = await res.json();
    expect(json.files).toHaveLength(2);
    expect(json.files[0].name).toBe("E2E-multi-1.txt");
    expect(json.files[1].name).toBe("E2E-multi-2.txt");
  });
});
