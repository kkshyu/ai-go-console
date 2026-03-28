/**
 * Circuit Breaker for LLM Provider (OpenRouter)
 *
 * Prevents cascading failures when the LLM provider is down by
 * short-circuiting requests after repeated failures.
 *
 * States:
 * - closed:    Normal operation, requests flow through.
 * - open:      Too many failures; requests are rejected immediately.
 * - half-open: Cooldown elapsed; one probe request is allowed through.
 *
 * Uses globalThis to survive Next.js HMR (same pattern as ActorSystemRegistry).
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxAttempts: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  cooldownMs: 30_000,
  halfOpenMaxAttempts: 1,
};

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Check if a request should be allowed through. */
  canRequest(): boolean {
    switch (this.state) {
      case "closed":
        return true;

      case "open": {
        const elapsed = Date.now() - this.lastFailureTime;
        if (elapsed >= this.config.cooldownMs) {
          this.state = "half-open";
          this.halfOpenAttempts = 0;
          return true;
        }
        return false;
      }

      case "half-open":
        if (this.halfOpenAttempts < this.config.halfOpenMaxAttempts) {
          this.halfOpenAttempts++;
          return true;
        }
        return false;
    }
  }

  /** Record a successful request. */
  recordSuccess(): void {
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.state = "closed";
  }

  /** Record a failed request. */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half-open") {
      this.state = "open";
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "open";
    }
  }

  /** Get current state for monitoring. */
  getState(): { state: CircuitState; failureCount: number } {
    // Auto-transition from open -> half-open when cooldown has elapsed
    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.cooldownMs) {
        this.state = "half-open";
        this.halfOpenAttempts = 0;
      }
    }
    return { state: this.state, failureCount: this.failureCount };
  }
}

/**
 * Custom error thrown when the circuit breaker is open.
 */
export class CircuitOpenError extends Error {
  constructor() {
    super("LLM circuit breaker is open — too many recent failures. Try again later.");
    this.name = "CircuitOpenError";
  }
}

// ---------------------------------------------------------------------------
// Process-level singleton (survives Next.js HMR)
// ---------------------------------------------------------------------------
const globalKey = Symbol.for("LLMCircuitBreaker");

function getCircuitBreaker(): CircuitBreaker {
  const g = globalThis as unknown as Record<symbol, CircuitBreaker>;
  if (!g[globalKey]) {
    g[globalKey] = new CircuitBreaker();
  }
  return g[globalKey];
}

export const llmCircuitBreaker = getCircuitBreaker();

/** Convenience accessor for monitoring dashboards. */
export function getLLMCircuitState() {
  return llmCircuitBreaker.getState();
}
