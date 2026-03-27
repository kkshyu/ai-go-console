import path from "node:path";
import * as sandbox from "@/lib/docker-sandbox";

const EXCLUDED_FILES = new Set([
  ".DS_Store",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
]);

/** Extensions considered as source code for content inclusion */
const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".html",
  ".md",
]);

/** Max characters for all file contents combined (~8000 tokens) */
const MAX_TOTAL_CHARS = 32000;

/** Max characters for a single file */
const MAX_FILE_CHARS = 16000;

interface FileEntry {
  relativePath: string;
  isDirectory: boolean;
}

interface FileWithContent {
  path: string;
  content: string;
  size: number;
}

/**
 * Build a visual tree string from file entries.
 */
function buildTreeString(entries: FileEntry[]): string {
  const lines: string[] = ["File tree:"];

  for (const entry of entries) {
    const depth = entry.relativePath.split("/").length - 1;
    const indent = "  ".repeat(depth);
    const name = path.basename(entry.relativePath);
    const prefix = entry.isDirectory ? `${indent}├── ${name}/` : `${indent}├── ${name}`;
    lines.push(prefix);
  }

  return lines.join("\n");
}

/**
 * Determine priority for file content inclusion.
 * Lower number = higher priority.
 */
function filePriority(relativePath: string): number {
  const name = path.basename(relativePath);

  if (name === "package.json" && !relativePath.includes("/")) return 0;

  if (relativePath === "src/app/page.tsx" || relativePath === "src/app/page.ts") return 1;
  if (relativePath === "src/App.tsx" || relativePath === "src/App.ts") return 1;
  if (relativePath === "src/index.ts" || relativePath === "src/index.tsx") return 1;

  if (relativePath === "src/app/layout.tsx") return 2;
  if (relativePath.includes("src/app/api/")) return 3;

  if (relativePath.startsWith("src/")) return 4;

  if (name === "tsconfig.json" || name === "tailwind.config.ts") return 5;

  return 10;
}

/**
 * Build file tree context string with optional file contents.
 * Reads from the app's Docker container instead of host filesystem.
 * Returns a string suitable for injection into agent system prompts.
 */
export async function buildFileTreeContext(orgSlug: string, slug: string): Promise<string> {
  let entries: FileEntry[];
  try {
    entries = await sandbox.listFileTree(orgSlug, slug);
  } catch {
    return "App container not found or not accessible.";
  }

  if (entries.length === 0) {
    return "App directory is empty.";
  }

  // Filter out excluded files
  entries = entries.filter((e) => {
    const name = path.basename(e.relativePath);
    if (name.startsWith(".") && name !== ".env.example") return false;
    if (EXCLUDED_FILES.has(name)) return false;
    return true;
  });

  // Build tree visualization
  const treeStr = buildTreeString(entries);

  // Collect source files for content inclusion
  const sourceFiles = entries.filter((e) => {
    if (e.isDirectory) return false;
    const ext = path.extname(e.relativePath);
    return SOURCE_EXTENSIONS.has(ext);
  });

  // Sort by priority
  sourceFiles.sort((a, b) => filePriority(a.relativePath) - filePriority(b.relativePath));

  // Read files within budget from Docker container
  const fileContents: FileWithContent[] = [];
  let totalChars = 0;

  for (const file of sourceFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    try {
      let content = await sandbox.readFile(orgSlug, slug, file.relativePath);
      const size = Buffer.byteLength(content, "utf-8");

      if (size > MAX_FILE_CHARS * 2) continue; // Skip very large files

      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(0, MAX_FILE_CHARS) + "\n... (truncated)";
      }

      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        const remaining = MAX_TOTAL_CHARS - totalChars;
        if (remaining > 500) {
          content = content.slice(0, remaining) + "\n... (truncated)";
          fileContents.push({ path: file.relativePath, content, size });
          totalChars += content.length;
        }
        break;
      }

      fileContents.push({ path: file.relativePath, content, size });
      totalChars += content.length;
    } catch {
      // Skip files that can't be read
    }
  }

  // Compose final context
  const parts = [treeStr];

  if (fileContents.length > 0) {
    parts.push("");
    for (const file of fileContents) {
      parts.push(`--- ${file.path} ---`);
      parts.push(file.content);
      parts.push("");
    }
  }

  return parts.join("\n");
}
