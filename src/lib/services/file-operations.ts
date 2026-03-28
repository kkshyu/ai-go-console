/**
 * File Operations Service
 *
 * Extracted from PM Actor. Handles writing files to app containers
 * based on agent output.
 */

import { writeFiles } from "../docker-sandbox";

export interface FileOperationResult {
  filesWritten: number;
  paths: string[];
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

  await writeFiles(orgSlug, appSlug, files);
  return {
    filesWritten: files.length,
    paths: files.map((f) => f.path),
  };
}
