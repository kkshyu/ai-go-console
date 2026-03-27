import fsp from "node:fs/promises";
import path from "node:path";
import { getAppPath } from "@/lib/generator";

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  ".cache",
]);

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
 * Recursively list all files in a directory, returning relative paths.
 */
async function walkDir(
  dir: string,
  baseDir: string
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  let dirEntries;
  try {
    dirEntries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return entries;
  }

  for (const entry of dirEntries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.example") continue;
    if (EXCLUDED_FILES.has(entry.name)) continue;

    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      entries.push({ relativePath, isDirectory: true });
      const children = await walkDir(fullPath, baseDir);
      entries.push(...children);
    } else {
      entries.push({ relativePath, isDirectory: false });
    }
  }

  return entries;
}

/**
 * Build a visual tree string from file entries.
 */
function buildTreeString(entries: FileEntry[]): string {
  // Group by directory structure
  const lines: string[] = ["File tree:"];

  // Simple flat listing with indentation based on depth
  for (const entry of entries) {
    const depth = entry.relativePath.split(path.sep).length - 1;
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

  // Highest priority: package.json
  if (name === "package.json" && !relativePath.includes(path.sep)) return 0;

  // Entry points
  if (relativePath === "src/app/page.tsx" || relativePath === "src/app/page.ts") return 1;
  if (relativePath === "src/App.tsx" || relativePath === "src/App.ts") return 1;
  if (relativePath === "src/index.ts" || relativePath === "src/index.tsx") return 1;

  // Layout and API routes
  if (relativePath === "src/app/layout.tsx") return 2;
  if (relativePath.includes("src/app/api/")) return 3;

  // Components and other source files
  if (relativePath.startsWith("src/")) return 4;

  // Config files
  if (name === "tsconfig.json" || name === "tailwind.config.ts") return 5;

  return 10;
}

/**
 * Build file tree context string with optional file contents.
 * Returns a string suitable for injection into agent system prompts.
 */
export async function buildFileTreeContext(slug: string): Promise<string> {
  const appDir = getAppPath(slug);

  let entries: FileEntry[];
  try {
    entries = await walkDir(appDir, appDir);
  } catch {
    return "App directory not found or not accessible.";
  }

  if (entries.length === 0) {
    return "App directory is empty.";
  }

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

  // Read files within budget
  const fileContents: FileWithContent[] = [];
  let totalChars = 0;

  for (const file of sourceFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) break;

    const fullPath = path.join(appDir, file.relativePath);
    try {
      const stat = await fsp.stat(fullPath);
      if (stat.size > MAX_FILE_CHARS * 2) continue; // Skip very large files

      let content = await fsp.readFile(fullPath, "utf-8");
      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(0, MAX_FILE_CHARS) + "\n... (truncated)";
      }

      if (totalChars + content.length > MAX_TOTAL_CHARS) {
        // Include truncated version if it fits partially
        const remaining = MAX_TOTAL_CHARS - totalChars;
        if (remaining > 500) {
          content = content.slice(0, remaining) + "\n... (truncated)";
          fileContents.push({
            path: file.relativePath,
            content,
            size: stat.size,
          });
          totalChars += content.length;
        }
        break;
      }

      fileContents.push({
        path: file.relativePath,
        content,
        size: stat.size,
      });
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
