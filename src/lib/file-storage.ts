/**
 * File Storage Utilities
 *
 * Read/write files to the disk-storage Docker volume via `docker cp` and `docker exec`.
 * The disk-storage container provides persistent shared storage at /data/storage.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);
const STORAGE_CONTAINER = "aigo-disk-storage";

/**
 * Write a file (Buffer) to disk-storage.
 * @param storagePath Path within the storage container (e.g., /data/storage/org/chat-files/abc/file.png)
 * @param data File content as Buffer
 */
export async function writeFileToStorage(storagePath: string, data: Buffer): Promise<void> {
  // Create parent directory in container
  const dir = storagePath.substring(0, storagePath.lastIndexOf("/"));
  await execFileAsync("docker", [
    "exec", STORAGE_CONTAINER, "mkdir", "-p", dir,
  ]);

  // Write to temp file, then docker cp into container
  const tempDir = join(tmpdir(), `aigo-upload-${Date.now()}`);
  const tempFile = join(tempDir, "upload");
  await mkdir(tempDir, { recursive: true });

  try {
    await writeFile(tempFile, data);
    await execFileAsync("docker", [
      "cp", tempFile, `${STORAGE_CONTAINER}:${storagePath}`,
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Read a file from disk-storage.
 * @param storagePath Path within the storage container
 * @returns File content as Buffer
 */
export async function readFileFromStorage(storagePath: string): Promise<Buffer> {
  const tempDir = join(tmpdir(), `aigo-read-${Date.now()}`);
  const tempFile = join(tempDir, "download");
  await mkdir(tempDir, { recursive: true });

  try {
    await execFileAsync("docker", [
      "cp", `${STORAGE_CONTAINER}:${storagePath}`, tempFile,
    ]);

    const { readFile } = await import("fs/promises");
    return await readFile(tempFile);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Check if a file exists in disk-storage.
 */
export async function fileExistsInStorage(storagePath: string): Promise<boolean> {
  try {
    await execFileAsync("docker", [
      "exec", STORAGE_CONTAINER, "test", "-f", storagePath,
    ]);
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
