/**
 * MinIO Storage Module
 *
 * Read/write files to the platform-managed MinIO instance.
 * Used for import file storage (replaces local filesystem for import paths).
 */

import { Client } from "minio";

const IMPORT_BUCKET = "import-files";

let _client: Client | null = null;

function getClient(): Client {
  if (_client) return _client;

  const endpoint = process.env.PLATFORM_MINIO_URL || "http://localhost:9000";
  const url = new URL(endpoint);

  _client = new Client({
    endPoint: url.hostname,
    port: Number(url.port) || 9000,
    useSSL: url.protocol === "https:",
    accessKey: process.env.PLATFORM_MINIO_ROOT_USER || "minioadmin",
    secretKey: process.env.PLATFORM_MINIO_ROOT_PASSWORD || "minioadmin",
  });

  return _client;
}

/**
 * Ensure the import bucket exists (idempotent).
 */
async function ensureBucket(): Promise<void> {
  const client = getClient();
  const exists = await client.bucketExists(IMPORT_BUCKET);
  if (!exists) {
    await client.makeBucket(IMPORT_BUCKET);
  }
}

/**
 * Build the MinIO object key for an import file.
 */
export function buildImportFileKey(
  orgSlug: string,
  importSessionId: string,
  fileId: string,
  fileName: string,
): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${orgSlug}/${importSessionId}/${fileId}/${safeName}`;
}

/**
 * Write a file to MinIO.
 */
export async function writeFileToMinIO(key: string, data: Buffer): Promise<void> {
  await ensureBucket();
  const client = getClient();
  await client.putObject(IMPORT_BUCKET, key, data, data.length);
}

/**
 * Read a file from MinIO.
 */
export async function readFileFromMinIO(key: string): Promise<Buffer> {
  const client = getClient();
  const stream = await client.getObject(IMPORT_BUCKET, key);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

/**
 * Check if a file exists in MinIO.
 */
export async function fileExistsInMinIO(key: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.statObject(IMPORT_BUCKET, key);
    return true;
  } catch {
    return false;
  }
}
