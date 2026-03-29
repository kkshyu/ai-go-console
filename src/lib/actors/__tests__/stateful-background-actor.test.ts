import { describe, test, expect, beforeEach } from "vitest";
import {
  StatefulBackgroundActor,
  BackgroundActorRegistry,
  InMemoryStateStore,
} from "../stateful-background-actor";
import { EventBus } from "../event-bus";

describe("StatefulBackgroundActor", () => {
  let store: InMemoryStateStore;
  let actor: StatefulBackgroundActor;

  beforeEach(async () => {
    store = new InMemoryStateStore();
    actor = new StatefulBackgroundActor("embedding", store);
    await actor.initialize();
  });

  test("initializes with default state", () => {
    const state = actor.getState();
    expect(state.role).toBe("embedding");
    expect(state.totalProcessed).toBe(0);
    expect(state.totalFailed).toBe(0);
    expect(state.lastActivityAt).toBe(0);
  });

  test("records success and persists state", async () => {
    await actor.recordSuccess();
    const state = actor.getState();
    expect(state.totalProcessed).toBe(1);
    expect(state.lastActivityAt).toBeGreaterThan(0);

    // Verify persistence
    const persisted = await store.get("bg-actor:embedding");
    expect(persisted?.totalProcessed).toBe(1);
  });

  test("records failure and persists state", async () => {
    await actor.recordFailure();
    const state = actor.getState();
    expect(state.totalFailed).toBe(1);
  });

  test("restores state from store on initialize", async () => {
    await actor.recordSuccess();
    await actor.recordSuccess();
    await actor.recordFailure();

    // Create a new actor with same role — should restore
    const actor2 = new StatefulBackgroundActor("embedding", store);
    await actor2.initialize();

    const state = actor2.getState();
    expect(state.totalProcessed).toBe(2);
    expect(state.totalFailed).toBe(1);
  });

  test("manages metadata", async () => {
    await actor.setMetadata("lastEmbeddedAt", 12345);
    expect(actor.getMetadata("lastEmbeddedAt")).toBe(12345);

    // Verify persistence
    const persisted = await store.get("bg-actor:embedding");
    expect((persisted?.metadata as Record<string, unknown>)?.lastEmbeddedAt).toBe(12345);
  });

  test("isHealthy returns true when recently active", async () => {
    expect(actor.isHealthy()).toBe(true); // never started = not unhealthy
    await actor.recordSuccess();
    expect(actor.isHealthy()).toBe(true);
    expect(actor.isHealthy(0)).toBe(false); // 0ms idle = always unhealthy
  });

  test("subscribes to events via event bus", async () => {
    const eventBus = new EventBus();
    actor.attachEventBus(eventBus);

    const received: string[] = [];
    actor.subscribe("artifact_saved", (event) => {
      received.push(event.type);
    });

    await eventBus.publish("artifact_saved", { id: "test" }, "system");
    expect(received).toEqual(["artifact_saved"]);
  });

  test("publishes events to event bus", async () => {
    const eventBus = new EventBus();
    actor.attachEventBus(eventBus);

    const received: string[] = [];
    eventBus.subscribe("embedding_complete", (event) => {
      received.push(event.source);
    });

    await actor.publish("embedding_complete", { chunks: 5 });
    expect(received).toEqual(["bg:embedding"]);
  });

  test("shutdown cleans up subscriptions", async () => {
    const eventBus = new EventBus();
    actor.attachEventBus(eventBus);

    const received: string[] = [];
    actor.subscribe("test_event", () => {
      received.push("should not fire");
    });

    actor.shutdown();

    await eventBus.publish("test_event", {}, "system");
    expect(received).toEqual([]);
  });
});

describe("BackgroundActorRegistry", () => {
  let store: InMemoryStateStore;
  let eventBus: EventBus;
  let registry: BackgroundActorRegistry;

  beforeEach(() => {
    store = new InMemoryStateStore();
    eventBus = new EventBus();
    registry = new BackgroundActorRegistry(store, eventBus);
  });

  test("registers and retrieves actors", async () => {
    const actor = await registry.register("embedding");
    expect(actor.role).toBe("embedding");
    expect(registry.get("embedding")).toBe(actor);
  });

  test("returns same actor on duplicate register", async () => {
    const actor1 = await registry.register("embedding");
    const actor2 = await registry.register("embedding");
    expect(actor1).toBe(actor2);
  });

  test("lists all registered actors", async () => {
    await registry.register("embedding");
    await registry.register("retrieval");
    expect(registry.getAll()).toHaveLength(2);
  });

  test("provides health status for all actors", async () => {
    const actor = await registry.register("embedding");
    await actor.recordSuccess();

    const status = registry.getHealthStatus();
    expect(status.embedding.healthy).toBe(true);
    expect(status.embedding.state.totalProcessed).toBe(1);
  });

  test("shutdown cleans up all actors", async () => {
    await registry.register("embedding");
    await registry.register("retrieval");

    registry.shutdown();
    expect(registry.getAll()).toHaveLength(0);
  });
});
