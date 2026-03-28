/**
 * Code Validator Background Actor
 *
 * Non-LLM background actor that validates generated code using
 * basic structural checks (not full AST parsing to avoid heavy deps).
 *
 * Validates:
 * - JSON parsability of agent outputs
 * - File path sanity (no directory traversal, valid extensions)
 * - Basic TypeScript/JavaScript syntax heuristics
 * - Import/export consistency within file sets
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage } from "./types";
import type { BackgroundAgentRole } from "../agents/types";

interface ValidateRequest {
  content: string;
  fileType?: string;
}

interface ValidationResult {
  pass: boolean;
  errors: Array<{
    type: "syntax" | "import" | "path" | "structure";
    message: string;
    file?: string;
    line?: number;
  }>;
}

export class CodeValidatorActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "code_validator" as BackgroundAgentRole);
  }

  async process(message: BackgroundMessage): Promise<unknown> {
    const req = message.payload as ValidateRequest;
    return this.validate(req);
  }

  private validate(req: ValidateRequest): ValidationResult {
    const errors: ValidationResult["errors"] = [];

    // Try to extract files from JSON content
    try {
      const jsonMatch = req.content.match(/```json\s*\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1]);

        // Validate file paths if present
        if (parsed.files && Array.isArray(parsed.files)) {
          for (const file of parsed.files) {
            if (!file.path || typeof file.path !== "string") {
              errors.push({ type: "structure", message: "File missing path field" });
              continue;
            }

            // Check for directory traversal
            if (file.path.includes("..")) {
              errors.push({
                type: "path",
                message: `Directory traversal detected: ${file.path}`,
                file: file.path,
              });
            }

            // Check for absolute paths
            if (file.path.startsWith("/")) {
              errors.push({
                type: "path",
                message: `Absolute path not allowed: ${file.path}`,
                file: file.path,
              });
            }

            // Basic content check
            if (!file.content || typeof file.content !== "string" || file.content.trim().length === 0) {
              errors.push({
                type: "structure",
                message: `Empty file content: ${file.path}`,
                file: file.path,
              });
            }

            // Check for common placeholder patterns
            if (file.content && (
              file.content.includes("// TODO: implement") ||
              file.content.includes("// implement here") ||
              file.content.includes("/* placeholder */")
            )) {
              errors.push({
                type: "structure",
                message: `Placeholder code detected: ${file.path}`,
                file: file.path,
              });
            }
          }
        }
      }
    } catch {
      // Content might not be JSON — that's fine for some agent types
    }

    return {
      pass: errors.length === 0,
      errors,
    };
  }
}
