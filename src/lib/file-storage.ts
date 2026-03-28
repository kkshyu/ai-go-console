/**
 * File Storage Utilities
 *
 * Read/write files to local filesystem storage.
 * Uses a configurable base directory (defaults to .data/storage in project root).
 */

import { writeFile, readFile, mkdir, access } from "node:fs/promises";
import { join, dirname } from "node:path";

/** Base directory for file storage — local filesystem */
const STORAGE_BASE = process.env.FILE_STORAGE_PATH || join(process.cwd(), ".data", "storage");

/**
 * Resolve a storage path to an absolute local filesystem path.
 * Strips the legacy /data/storage prefix if present for backward compatibility.
 */
function resolveLocalPath(storagePath: string): string {
  const relative = storagePath.replace(/^\/data\/storage\//, "");
  return join(STORAGE_BASE, relative);
}

/**
 * Write a file (Buffer) to storage.
 * @param storagePath Logical storage path (e.g., orgSlug/chat-files/abc/file.png)
 * @param data File content as Buffer
 */
export async function writeFileToStorage(storagePath: string, data: Buffer): Promise<void> {
  const localPath = resolveLocalPath(storagePath);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, data);
}

/**
 * Read a file from storage.
 * @param storagePath Logical storage path
 * @returns File content as Buffer
 */
export async function readFileFromStorage(storagePath: string): Promise<Buffer> {
  const localPath = resolveLocalPath(storagePath);
  return readFile(localPath);
}

/**
 * Check if a file exists in storage.
 */
export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
  try {
    const localPath = resolveLocalPath(storagePath);
    await access(localPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the storage path for a chat file.
 * @param orgSlug Organization slug
 * @param fileId ChatFile ID
 * @param fileName Original file name
 */
export function buildChatFileStoragePath(orgSlug: string, fileId: string, fileName: string): string {
  // Sanitize filename to prevent path traversal
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `/data/storage/${orgSlug}/chat-files/${fileId}/${safeName}`;
}
