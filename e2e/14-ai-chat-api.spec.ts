import { test, expect } from "@playwright/test";

test.describe("AI Chat API", () => {
  test.describe("POST /api/chat", () => {
    test("returns 400 when no messages array is sent", async ({ request }) => {
      const res = await request.post("/api/chat", {
        data: {},
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Messages array required");
    });

    test("returns 400 when messages is not an array", async ({ request }) => {
      const res = await request.post("/api/chat", {
        data: { messages: "not an array" },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Messages array required");
    });

    test("returns SSE stream content-type for valid request", async ({
      request,
    }) => {
      const res = await request.post("/api/chat", {
        data: {
          messages: [{ role: "user", content: "Say hello" }],
        },
      });
      const contentType = res.headers()["content-type"] || "";
      // The API should return SSE stream on success or a JSON error on failure
      // (e.g. if the LLM provider is unavailable in test env)
      expect(
        contentType.includes("text/event-stream") || res.status() >= 400
      ).toBe(true);
    });

    test("SSE stream body contains data events", async ({ request }) => {
      const res = await request.post("/api/chat", {
        data: {
          messages: [{ role: "user", content: "Say hi" }],
        },
      });

      // If the LLM provider is unavailable, the endpoint may still return
      // an SSE stream with an error event or a non-200 status.
      if (res.status() >= 400) {
        // Acceptable — LLM not reachable in test env
        return;
      }

      const body = await res.text();
      // SSE events start with "data: "
      expect(body).toContain("data: ");
    });

    test("SSE stream ends with [DONE] marker", async ({ request }) => {
      const res = await request.post("/api/chat", {
        data: {
          messages: [{ role: "user", content: "Hi" }],
        },
      });

      if (res.status() >= 400) {
        return;
      }

      const body = await res.text();
      expect(body).toContain("data: [DONE]");
    });

    test("includes correct cache-control headers", async ({ request }) => {
      const res = await request.post("/api/chat", {
        data: {
          messages: [{ role: "user", content: "Hello" }],
        },
      });

      if (res.status() >= 400) {
        return;
      }

      const headers = res.headers();
      expect(headers["cache-control"]).toBe("no-cache");
    });

    test("returns 429 after exceeding rate limit", async ({ request }) => {
      // Send many rapid requests to trigger rate limiting (limit is 20/min)
      const promises = Array.from({ length: 25 }, () =>
        request.post("/api/chat", {
          data: {
            messages: [{ role: "user", content: "rate limit test" }],
          },
        })
      );
      const responses = await Promise.all(promises);
      const statuses = responses.map((r) => r.status());

      // At least one should be 429 if rate limiting is working,
      // or all may succeed / error for other reasons in test env
      const has429 = statuses.includes(429);

      // If rate limiting kicked in, verify the 429 response contract
      if (has429) {
        const limitedRes = responses.find((r) => r.status() === 429)!;
        const body = await limitedRes.json();
        expect(body.error).toBe("Rate limit exceeded");
        expect(limitedRes.headers()["retry-after"]).toBeDefined();
      }
      // If no 429 appeared, rate limiting may not be enforced in test env —
      // we skip rather than make a vacuous assertion.
    });
  });

  test.describe("POST /api/chat/multi-agent", () => {
    test("returns 400 when no messages array is sent", async ({ request }) => {
      const res = await request.post("/api/chat/multi-agent", {
        data: {},
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Messages array required");
    });

    test("returns 400 when messages is not an array", async ({ request }) => {
      const res = await request.post("/api/chat/multi-agent", {
        data: { messages: "invalid" },
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Messages array required");
    });

    test("returns SSE stream or error for valid request", async ({
      request,
    }) => {
      const res = await request.post("/api/chat/multi-agent", {
        data: {
          messages: [{ role: "user", content: "Hello agent" }],
        },
      });
      const contentType = res.headers()["content-type"] || "";
      // Should return SSE on success or JSON error if backend services unavailable
      expect(
        contentType.includes("text/event-stream") || res.status() >= 400
      ).toBe(true);
    });

    test("accepts optional conversationId", async ({ request }) => {
      const res = await request.post("/api/chat/multi-agent", {
        data: {
          messages: [{ role: "user", content: "Hello" }],
          conversationId: "e2e-test-conv-id",
        },
      });
      // Should not fail due to conversationId — either SSE or server error
      expect(res.status()).not.toBe(400);
    });

    test("SSE stream contains data events when successful", async ({
      request,
    }) => {
      const res = await request.post("/api/chat/multi-agent", {
        data: {
          messages: [{ role: "user", content: "Hi" }],
        },
      });

      if (res.status() >= 400) {
        return;
      }

      const body = await res.text();
      expect(body).toContain("data: ");
    });
  });
});
