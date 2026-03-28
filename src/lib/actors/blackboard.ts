/**
 * Blackboard — Shared In-Memory Key-Value Store
 *
 * Provides a typed, centralized state store that agents can read from and
 * write to during DAG execution. Replaces the pattern of passing full
 * conversation history as context to each agent.
 *
 * Thread safety: single-writer per key (enforced by DAG layer ordering),
 * concurrent reads are safe since values are immutable once written.
 */

export class Blackboard {
  private store = new Map<string, unknown>();
  private writeLog: Array<{ key: string; writer: string; timestamp: number }> = [];

  /** Write a value to the blackboard. */
  set<T>(key: string, value: T, writer?: string): void {
    this.store.set(key, value);
    this.writeLog.push({
      key,
      writer: writer ?? "unknown",
      timestamp: Date.now(),
    });
  }

  /** Read a value from the blackboard. Returns undefined if not set. */
  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  /** Check if a key exists. */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Get all keys. */
  keys(): string[] {
    return Array.from(this.store.keys());
  }

  /**
   * Read multiple keys and return them as a record.
   * Missing keys are omitted from the result.
   */
  getMany<T = unknown>(keys: string[]): Record<string, T> {
    const result: Record<string, T> = {};
    for (const key of keys) {
      if (this.store.has(key)) {
        result[key] = this.store.get(key) as T;
      }
    }
    return result;
  }

  /** Get all entries as a plain object. */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.store) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Build a context string from specified keys for injection into agent prompts.
   * Each key-value pair is serialized as a labeled section.
   */
  buildContext(keys: string[], maxChars = 8000): string {
    const sections: string[] = [];
    let totalChars = 0;

    for (const key of keys) {
      const value = this.store.get(key);
      if (value === undefined) continue;

      const serialized = typeof value === "string"
        ? value
        : JSON.stringify(value, null, 2);

      const section = `--- ${key.toUpperCase()} ---\n${serialized}`;

      if (totalChars + section.length > maxChars) {
        // Truncate this section to fit
        const remaining = maxChars - totalChars;
        if (remaining > 50) {
          sections.push(section.slice(0, remaining) + "\n[truncated]");
        }
        break;
      }

      sections.push(section);
      totalChars += section.length;
    }

    return sections.join("\n\n");
  }

  /** Get the write log for debugging/auditing. */
  getWriteLog(): ReadonlyArray<{ key: string; writer: string; timestamp: number }> {
    return this.writeLog;
  }

  /** Clear all data. */
  clear(): void {
    this.store.clear();
    this.writeLog = [];
  }
}
