/**
 * LLM Output Schema Validator
 *
 * Validates and extracts structured data from LLM outputs
 * instead of relying purely on regex + JSON.parse.
 */

import { sanitizeFilePath } from "./file-operations";

// ---- JSON Extraction ----

/**
 * Extract and parse JSON from LLM output.
 * Tries multiple strategies:
 * 1. JSON code block (```json...```)
 * 2. Raw JSON object (starts with {)
 * 3. JSON within text
 *
 * Returns null if no valid JSON found.
 */
export function extractJson<T = Record<string, unknown>>(
  content: string,
): T | null {
  if (!content) return null;

  // Strategy 1: JSON code block
  const codeBlockMatch = content.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as T;
    } catch {
      // Try to fix common JSON errors
      const fixed = attemptJsonFix(codeBlockMatch[1]);
      if (fixed) return fixed as T;
    }
  }

  // Strategy 2: Raw JSON object
  const trimmed = content.trim();
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // Try to find the end of the JSON
      const endIndex = findJsonEnd(trimmed);
      if (endIndex > 0) {
        try {
          return JSON.parse(trimmed.slice(0, endIndex + 1)) as T;
        } catch { /* continue */ }
      }
    }
  }

  // Strategy 3: JSON within text
  const jsonInText = content.match(/\{[\s\S]*\}/);
  if (jsonInText) {
    try {
      return JSON.parse(jsonInText[0]) as T;
    } catch { /* give up */ }
  }

  return null;
}

// ---- PM Action Validation ----

export type ValidAgentTarget = "architect" | "developer" | "reviewer" | "devops";

export interface ValidPMDispatch {
  action: "dispatch";
  target: ValidAgentTarget;
  task: string;
}

export interface ValidPMDispatchParallel {
  action: "dispatch_parallel";
  target: "developer";
  tasks: Array<{ taskId: string; task: string; files: string[] }>;
}

export interface ValidPMRespond {
  action: "respond";
  message: string;
}

export interface ValidPMComplete {
  action: "complete";
  summary: string;
}

export type ValidPMAction =
  | ValidPMDispatch
  | ValidPMDispatchParallel
  | ValidPMRespond
  | ValidPMComplete;

/**
 * Validate and extract PM action from LLM output.
 * Returns the validated action or null with a reason.
 * Skips update_prd blocks (handled separately) and validates the main action.
 */
export function validatePMAction(
  content: string,
): { action: ValidPMAction } | { error: string } {
  // Extract all JSON blocks and find the first non-update_prd action
  const jsonBlocks = [...content.matchAll(/```(?:json)?\s*\n([\s\S]*?)\n```/g)];
  let parsed: Record<string, unknown> | null = null;

  for (const match of jsonBlocks) {
    try {
      const obj = JSON.parse(match[1]) as Record<string, unknown>;
      if (obj.action === "update_prd") continue; // skip PRD updates
      parsed = obj;
      break;
    } catch {
      continue;
    }
  }

  // Fallback to extractJson if no code block match
  if (!parsed) {
    parsed = extractJson(content);
  }

  if (!parsed) {
    return { error: "No valid JSON found in PM output" };
  }

  const obj = parsed;
  const action = obj.action;

  if (typeof action !== "string") {
    return { error: "Missing or invalid 'action' field" };
  }

  // Skip update_prd if it was the only action found via fallback
  if (action === "update_prd") {
    return { error: "Only update_prd found, no main action" };
  }

  switch (action) {
    case "dispatch": {
      if (typeof obj.target !== "string" || !obj.target) {
        return { error: "dispatch: missing 'target'" };
      }
      if (typeof obj.task !== "string" || !obj.task) {
        return { error: "dispatch: missing 'task'" };
      }
      const validTargets = ["architect", "developer", "reviewer", "devops"];
      if (!validTargets.includes(obj.target)) {
        return { error: `dispatch: invalid target '${obj.target}'` };
      }
      return {
        action: {
          action: "dispatch",
          target: obj.target as ValidAgentTarget,
          task: obj.task as string,
        },
      };
    }

    case "dispatch_parallel": {
      if (!Array.isArray(obj.tasks) || obj.tasks.length === 0) {
        return { error: "dispatch_parallel: missing or empty 'tasks'" };
      }
      for (let i = 0; i < obj.tasks.length; i++) {
        const t = obj.tasks[i] as Record<string, unknown>;
        if (typeof t.taskId !== "string") {
          return { error: `dispatch_parallel: task[${i}] missing 'taskId'` };
        }
        if (typeof t.task !== "string") {
          return { error: `dispatch_parallel: task[${i}] missing 'task'` };
        }
        if (!Array.isArray(t.files)) {
          return { error: `dispatch_parallel: task[${i}] missing 'files' array` };
        }
      }
      return {
        action: {
          action: "dispatch_parallel",
          target: "developer",
          tasks: obj.tasks as ValidPMDispatchParallel["tasks"],
        },
      };
    }

    case "respond": {
      if (typeof obj.message !== "string") {
        return { error: "respond: missing 'message'" };
      }
      return {
        action: {
          action: "respond",
          message: obj.message,
        },
      };
    }

    case "complete": {
      if (typeof obj.summary !== "string") {
        return { error: "complete: missing 'summary'" };
      }
      return {
        action: {
          action: "complete",
          summary: obj.summary,
        },
      };
    }

    default:
      return { error: `Unknown action: '${action}'` };
  }
}

// ---- Agent Output Validation ----

export interface AgentOutputFiles {
  action: string;
  files: Array<{ path: string; content: string }>;
  requiredServices?: Array<{ instanceId: string; name: string; type: string }>;
  packages?: string[];
}

/**
 * Validate agent output contains valid file operations.
 */
export function validateAgentFileOutput(content: string): AgentOutputFiles | null {
  const parsed = extractJson<AgentOutputFiles>(content);
  if (!parsed) return null;

  if (!parsed.action || typeof parsed.action !== "string") return null;
  if (!Array.isArray(parsed.files)) return null;

  // Validate each file has path and content, and sanitize paths
  parsed.files = parsed.files.filter((file) => {
    if (typeof file.path !== "string" || typeof file.content !== "string") {
      return false;
    }
    return sanitizeFilePath(file.path) !== null;
  });

  if (parsed.files.length === 0) return null;

  return parsed;
}

// ---- Helpers ----

/**
 * Attempt to fix common JSON issues from LLM output.
 */
function attemptJsonFix(jsonStr: string): Record<string, unknown> | null {
  let fixed = jsonStr.trim();

  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([\]}])/g, "$1");

  // Remove comments
  fixed = fixed.replace(/\/\/.*$/gm, "");

  try {
    return JSON.parse(fixed);
  } catch {
    return null;
  }
}

/**
 * Find the matching closing brace for a JSON object.
 */
function findJsonEnd(str: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (char === "\\") {
      escape = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") depth++;
    if (char === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}
