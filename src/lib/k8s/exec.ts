/**
 * Kubernetes Pod Exec & File Copy Helpers
 *
 * Replaces `docker exec` and `docker cp` with k8s equivalents.
 * Uses the k8s exec WebSocket API for command execution and
 * tar-based file transfer for copying files to/from pods.
 */

import * as k8s from "@kubernetes/client-node";
import { Writable, PassThrough } from "stream";
import { execApi, cpApi, coreApi, isK8sNotFound } from "./client";
import { tmpdir } from "os";
import { join } from "path";
import { mkdtemp, writeFile, rm } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const DEFAULT_CONTAINER = "app";
const EXEC_TIMEOUT_MS = 120_000; // 2 minutes

// ── Exec in Pod ──────────────────────────────────────────────────────────────

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Execute a command inside a pod container.
 * Equivalent to `docker exec <container> <cmd>`.
 */
export async function execInPod(
  namespace: string,
  podName: string,
  command: string[],
  options?: {
    container?: string;
    stdin?: string;
    timeoutMs?: number;
  },
): Promise<ExecResult> {
  const container = options?.container || DEFAULT_CONTAINER;
  const timeoutMs = options?.timeoutMs || EXEC_TIMEOUT_MS;

  return new Promise<ExecResult>((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const stdoutStream = new Writable({
      write(chunk, _encoding, callback) {
        stdout += chunk.toString();
        callback();
      },
    });

    const stderrStream = new Writable({
      write(chunk, _encoding, callback) {
        stderr += chunk.toString();
        callback();
      },
    });

    const stdinStream = options?.stdin ? new PassThrough() : undefined;

    const timeout = setTimeout(() => {
      reject(new Error(`Exec in pod ${podName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    execApi()
      .exec(
        namespace,
        podName,
        container,
        command,
        stdoutStream,
        stderrStream,
        stdinStream ?? null,
        false, // tty
        (status: k8s.V1Status) => {
          clearTimeout(timeout);
          const exitCode = status.status === "Success" ? 0 : 1;
          resolve({ stdout, stderr, exitCode });
        },
      )
      .then((ws) => {
        if (stdinStream && options?.stdin) {
          stdinStream.write(options.stdin);
          stdinStream.end();
        }
        // Handle WebSocket errors
        ws.on("error", (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        });
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });
}

// ── Copy to Pod ──────────────────────────────────────────────────────────────

/**
 * Write files into a pod container.
 * Equivalent to `docker cp` (host → container).
 *
 * Creates a tar archive from the provided files and extracts it inside the pod.
 */
export async function copyToPod(
  namespace: string,
  podName: string,
  files: Array<{ path: string; content: string | Buffer }>,
  options?: {
    container?: string;
    basePath?: string;
  },
): Promise<void> {
  const container = options?.container || DEFAULT_CONTAINER;
  const basePath = options?.basePath || "/app";

  // Create a temp directory with the files
  const tempDir = await mkdtemp(join(tmpdir(), "k8s-cp-"));

  try {
    // Write files to temp directory preserving relative paths
    for (const file of files) {
      const fullPath = join(tempDir, file.path);
      const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));

      await execFileAsync("mkdir", ["-p", dir]);

      if (typeof file.content === "string") {
        await writeFile(fullPath, file.content, "utf-8");
      } else {
        await writeFile(fullPath, file.content);
      }
    }

    // Use kubectl cp (via k8s Cp API) to copy the temp directory to the pod
    await cpApi().cpToPod(
      namespace,
      podName,
      container,
      tempDir,
      basePath,
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/**
 * Write a single file buffer to a pod container.
 */
export async function copyBufferToPod(
  namespace: string,
  podName: string,
  targetPath: string,
  buffer: Buffer,
  options?: { container?: string },
): Promise<void> {
  const container = options?.container || DEFAULT_CONTAINER;
  const dir = targetPath.substring(0, targetPath.lastIndexOf("/"));

  // Ensure target directory exists
  await execInPod(namespace, podName, ["mkdir", "-p", dir], { container });

  // Write via base64-encoded stdin to avoid binary issues
  const b64 = buffer.toString("base64");
  await execInPod(
    namespace,
    podName,
    ["sh", "-c", `echo '${b64}' | base64 -d > ${targetPath}`],
    { container },
  );
}

// ── Copy from Pod ────────────────────────────────────────────────────────────

/**
 * Copy a file or directory from a pod to local filesystem.
 * Equivalent to `docker cp` (container → host).
 */
export async function copyFromPod(
  namespace: string,
  podName: string,
  remotePath: string,
  localDir: string,
  options?: { container?: string },
): Promise<void> {
  const container = options?.container || DEFAULT_CONTAINER;

  await cpApi().cpFromPod(
    namespace,
    podName,
    container,
    remotePath,
    localDir,
  );
}

// ── High-level Helpers ───────────────────────────────────────────────────────

/**
 * Read a file from inside a pod.
 * Equivalent to `docker exec <container> cat <path>`.
 */
export async function readFileFromPod(
  namespace: string,
  podName: string,
  filePath: string,
  options?: { container?: string },
): Promise<string> {
  const result = await execInPod(namespace, podName, ["cat", filePath], {
    container: options?.container,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Failed to read ${filePath}: ${result.stderr}`);
  }

  return result.stdout;
}

/**
 * List directory contents in a pod.
 * Returns parsed entries similar to docker-sandbox's readDirectory.
 */
export async function readDirectoryFromPod(
  namespace: string,
  podName: string,
  dirPath: string,
  options?: { container?: string },
): Promise<Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }>> {
  // Use stat-based listing for structured output
  const result = await execInPod(
    namespace,
    podName,
    [
      "sh", "-c",
      `cd "${dirPath}" 2>/dev/null && find . -maxdepth 1 ! -name '.' -printf '%y\\t%s\\t%T+\\t%f\\n' 2>/dev/null || ls -la "${dirPath}"`,
    ],
    { container: options?.container },
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list ${dirPath}: ${result.stderr}`);
  }

  const entries: Array<{ name: string; type: "file" | "directory"; size: number; mtime: string }> = [];

  for (const line of result.stdout.trim().split("\n")) {
    if (!line) continue;
    const parts = line.split("\t");
    if (parts.length >= 4) {
      const [typeChar, sizeStr, mtime, name] = parts;
      entries.push({
        name,
        type: typeChar === "d" ? "directory" : "file",
        size: parseInt(sizeStr, 10) || 0,
        mtime: mtime || new Date().toISOString(),
      });
    }
  }

  return entries;
}

/**
 * List all files in a pod recursively.
 * Equivalent to docker-sandbox's listFileTree.
 */
export async function listFileTreeFromPod(
  namespace: string,
  podName: string,
  basePath: string = "/app",
  options?: { container?: string },
): Promise<Array<{ relativePath: string; isDirectory: boolean }>> {
  const result = await execInPod(
    namespace,
    podName,
    [
      "find", basePath,
      "-not", "-path", "*/node_modules/*",
      "-not", "-path", "*/.next/*",
      "-not", "-path", "*/.git/*",
      "-printf", "%y\t%P\n",
    ],
    { container: options?.container },
  );

  if (result.exitCode !== 0) {
    throw new Error(`Failed to list file tree: ${result.stderr}`);
  }

  const entries: Array<{ relativePath: string; isDirectory: boolean }> = [];

  for (const line of result.stdout.trim().split("\n")) {
    if (!line) continue;
    const [typeChar, relativePath] = line.split("\t");
    if (relativePath) {
      entries.push({
        relativePath,
        isDirectory: typeChar === "d",
      });
    }
  }

  return entries;
}

/**
 * Install npm packages in a pod.
 * Equivalent to `docker exec <container> npm install <packages>`.
 */
export async function installPackagesInPod(
  namespace: string,
  podName: string,
  packages: string[],
  options?: { container?: string },
): Promise<string> {
  const result = await execInPod(
    namespace,
    podName,
    ["npm", "install", "--save", ...packages],
    {
      container: options?.container,
      timeoutMs: 300_000, // 5 min for npm install
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(`npm install failed: ${result.stderr}`);
  }

  return result.stdout;
}

// ── Pod Status Helper ────────────────────────────────────────────────────────

export type PodStatus = "running" | "stopped" | "pending" | "error" | "not_found";

/**
 * Get the status of a pod.
 */
export async function getPodStatus(
  namespace: string,
  podName: string,
): Promise<PodStatus> {
  try {
    const podStatus = await coreApi().readNamespacedPodStatus({ name: podName, namespace });
    const phase = podStatus.status?.phase;

    switch (phase) {
      case "Running":
        return "running";
      case "Pending":
        return "pending";
      case "Succeeded":
        return "stopped";
      case "Failed":
        return "error";
      default:
        return "stopped";
    }
  } catch (err: unknown) {
    if (isK8sNotFound(err)) return "not_found";
    throw err;
  }
}
