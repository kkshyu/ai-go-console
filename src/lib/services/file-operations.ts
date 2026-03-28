/**
 * File Operations Service
 *
 * Extracted from PM Actor. Handles writing files to app containers
 * based on agent output.
 */

import path from "node:path";

import { writeFiles } from "../k8s/sandbox";

export interface FileOperationResult {
  filesWritten: number;
  paths: string[];
}

/**
 * Sanitize a file path to prevent path traversal attacks.
 * Returns the normalized path if safe, or null if the path is rejected.
 */
export function sanitizeFilePath(filePath: string): string | null {
  if (filePath.includes("\0")) return null;
  if (filePath.startsWith("/") || filePath.startsWith("\\")) return null;
  const normalized = path.normalize(filePath);
  if (normalized.includes("..")) return null;
  return normalized;
}

/**
 * Parse agent output and write files to the app container.
 * Returns null if no file operations were found in the content.
 */
export async function executeFileOperations(
  content: string,
  orgSlug: string,
  appSlug: string,
): Promise<FileOperationResult | null> {
  const jsonMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
  if (!jsonMatch) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch[1]);
  } catch {
    return null;
  }

  const files = parsed.files as Array<{ path: string; content: string }> | undefined;
  const action = parsed.action as string | undefined;

  if (
    !files ||
    !Array.isArray(files) ||
    files.length === 0 ||
    !["modify_files", "create_app", "update_app"].includes(action || "")
  ) {
    return null;
  }

  const safeFiles = files.filter((f) => sanitizeFilePath(f.path) !== null);
  if (safeFiles.length === 0) return null;

  await writeFiles(orgSlug, appSlug, safeFiles);
  return {
    filesWritten: safeFiles.length,
    paths: safeFiles.map((f) => f.path),
  };
}
