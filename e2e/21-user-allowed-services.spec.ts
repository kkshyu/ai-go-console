import { test, expect } from "@playwright/test";
import { SEED_USER } from "./helpers";

/**
 * Tests for the user allowed-services API.
 * Uses alice@example.com (SEED_USER) to avoid disrupting admin state.
 */
test.describe("User Allowed Services API", () => {
  let aliceId: string;
  let orgServiceIds: string[];
  let originalAllowed: string[];

  test("setup: resolve alice userId and available services", async ({
    request,
  }) => {
    const usersRes = await request.get("/api/users");
    expect(usersRes.status()).toBe(200);
    const users = await usersRes.json();
    const alice = users.find(
      (u: { email: string }) => u.email === SEED_USER.email
    );
    expect(alice).toBeDefined();
    aliceId = alice.id;

    const svcRes = await request.get("/api/services");
    expect(svcRes.status()).toBe(200);
    const services = await svcRes.json();
    expect(services.length).toBeGreaterThan(0);
    orgServiceIds = services.map((s: { id: string }) => s.id);

    const allowedRes = await request.get(
      `/api/users/${aliceId}/allowed-services`
    );
    expect(allowedRes.status()).toBe(200);
    originalAllowed = (await allowedRes.json()).map(
      (s: { id: string }) => s.id
    );
  });

  test("GET returns array of allowed services", async ({ request }) => {
    const res = await request.get(
      `/api/users/${aliceId}/allowed-services`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    for (const svc of body) {
      expect(svc).toHaveProperty("id");
      expect(svc).toHaveProperty("name");
      expect(svc).toHaveProperty("type");
    }
  });

  test("PUT updates allowed services list", async ({ request }) => {
    const toAssign = orgServiceIds.slice(0, 2);
    const res = await request.put(
      `/api/users/${aliceId}/allowed-services`,
      { data: { serviceIds: toAssign } }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    const returnedIds = body.map((s: { id: string }) => s.id).sort();
    expect(returnedIds).toEqual([...toAssign].sort());
  });

  test("PUT persists: GET reflects the update", async ({ request }) => {
    const res = await request.get(
      `/api/users/${aliceId}/allowed-services`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    const ids = body.map((s: { id: string }) => s.id).sort();
    const expected = orgServiceIds.slice(0, 2).sort();
    expect(ids).toEqual(expected);
  });

  test("PUT with empty array removes all allowed services", async ({
    request,
  }) => {
    const res = await request.put(
      `/api/users/${aliceId}/allowed-services`,
      { data: { serviceIds: [] } }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);

    const getRes = await request.get(
      `/api/users/${aliceId}/allowed-services`
    );
    expect(getRes.status()).toBe(200);
    expect(await getRes.json()).toEqual([]);
  });

  test("GET with invalid userId returns 404", async ({ request }) => {
    const res = await request.get(
      "/api/users/non-existent-id/allowed-services"
    );
    expect(res.status()).toBe(404);
  });

  test("PUT with missing body returns 400", async ({ request }) => {
    const res = await request.put(
      `/api/users/${aliceId}/allowed-services`,
      { data: {} }
    );
    expect(res.status()).toBe(400);
  });

  test("cleanup: restore original allowed services", async ({ request }) => {
    await request.put(`/api/users/${aliceId}/allowed-services`, {
      data: { serviceIds: originalAllowed },
    });
  });
});
