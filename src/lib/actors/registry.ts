/**
 * Global ActorSystem Registry
 *
 * A process-level singleton that tracks all active ActorSystem instances.
 * Since ActorSystems are request-scoped (created per SSE request), this
 * registry allows monitoring dashboards to query live actor states.
 *
 * Uses globalThis to survive Next.js HMR (same pattern as Prisma client).
 */

import type { ActorSystem } from "./actor-system";
import type { ActorState } from "./types";

export interface RegisteredSession {
  id: string;
  system: ActorSystem;
  userId?: string;
  appId?: string;
  conversationId: string;
  startedAt: number;
  model: string;
}

export interface RegisteredSessionSnapshot {
  id: string;
  userId?: string;
  appId?: string;
  conversationId: string;
  startedAt: number;
  model: string;
  actors: ActorState[];
  actorCount: number;
}

class ActorSystemRegistry {
  private sessions: Map<string, RegisteredSession> = new Map();

  register(session: RegisteredSession): void {
    this.sessions.set(session.id, session);
  }

  unregister(id: string): void {
    this.sessions.delete(id);
  }

  getAllSessions(): RegisteredSessionSnapshot[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      userId: s.userId,
      appId: s.appId,
      conversationId: s.conversationId,
      startedAt: s.startedAt,
      model: s.model,
      actors: s.system.getAllStates(),
      actorCount: s.system.getAllActorIds().length,
    }));
  }

  getSession(id: string): RegisteredSessionSnapshot | null {
    const s = this.sessions.get(id);
    if (!s) return null;
    return {
      id: s.id,
      userId: s.userId,
      appId: s.appId,
      conversationId: s.conversationId,
      startedAt: s.startedAt,
      model: s.model,
      actors: s.system.getAllStates(),
      actorCount: s.system.getAllActorIds().length,
    };
  }

  get sessionCount(): number {
    return this.sessions.size;
  }
}

const globalKey = Symbol.for("ActorSystemRegistry");

function getRegistry(): ActorSystemRegistry {
  const g = globalThis as unknown as Record<symbol, ActorSystemRegistry>;
  if (!g[globalKey]) {
    g[globalKey] = new ActorSystemRegistry();
  }
  return g[globalKey];
}

export const actorSystemRegistry = getRegistry();
