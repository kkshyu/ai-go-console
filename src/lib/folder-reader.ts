/**
 * Shared utility for reading folder contents from the browser FileSystem API.
 * Used by file-manager and import-app-dialog.
 */

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  ".cache",
  "__pycache__",
  ".svn",
  "vendor",
  ".DS_Store",
]);

const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp",
  ".woff", ".woff2", ".ttf", ".eot", ".otf",
  ".mp3", ".mp4", ".webm", ".ogg", ".wav", ".flac",
  ".zip", ".tar", ".gz", ".rar", ".7z",
  ".exe", ".dll", ".so", ".dylib",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".bin", ".dat", ".db", ".sqlite",
]);

/** Max size for a single file to be read as text (100KB) */
const MAX_FILE_SIZE = 100 * 1024;

/**
 * Check whether a file should be included based on its relative path.
 * Skips binary files and common non-source directories.
 */
export function shouldIncludeFile(relativePath: string): boolean {
  const segments = relativePath.split("/");
  for (const seg of segments) {
    if (SKIP_DIRS.has(seg)) return false;
  }
  const ext = relativePath.slice(relativePath.lastIndexOf(".")).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) return false;
  return true;
}

/**
 * Check whether a directory entry should be traversed.
 */
function shouldTraverseDir(name: string): boolean {
  return !SKIP_DIRS.has(name);
}

/**
 * Read a File as text. Returns null if file is too large or appears binary.
 */
export async function readFileAsText(file: File): Promise<string | null> {
  if (file.size > MAX_FILE_SIZE) return null;
  if (file.size === 0) return "";
  try {
    const text = await file.text();
    // Check for binary content (null bytes)
    if (text.includes("\0")) return null;
    return text;
  } catch {
    return null;
  }
}

/**
 * Recursively read all files from a DataTransferItem directory entry.
 * Skips directories in SKIP_DIRS for efficiency.
 */
export async function readEntryFiles(
  entry: FileSystemEntry,
  basePath: string
): Promise<Array<{ file: File; relativePath: string }>> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file((file) => {
        resolve([{ file, relativePath: basePath + file.name }]);
      });
    });
  }
  if (entry.isDirectory) {
    if (!shouldTraverseDir(entry.name) && basePath !== "") {
      return [];
    }
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      const allEntries: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...batch);
            readBatch();
          }
        });
      };
      readBatch();
    });
    const results: Array<{ file: File; relativePath: string }> = [];
    for (const child of entries) {
      const childFiles = await readEntryFiles(
        child,
        basePath + entry.name + "/"
      );
      results.push(...childFiles);
    }
    return results;
  }
  return [];
}

/**
 * Convert a FileList from an <input webkitdirectory> into the same format
 * as readEntryFiles output.
 */
export function readInputFiles(
  fileList: FileList
): Array<{ file: File; relativePath: string }> {
  const results: Array<{ file: File; relativePath: string }> = [];
  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    // webkitRelativePath includes the root folder name
    const relativePath = file.webkitRelativePath || file.name;
    results.push({ file, relativePath });
  }
  return results;
}
