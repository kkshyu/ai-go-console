/**
 * Parallel Merge Service
 *
 * Extracted from PM Actor. Handles merging output from multiple
 * parallel developer actors, including conflict detection.
 */

export interface MergedFile {
  path: string;
  content: string;
  sourceTaskId: string;
}

export interface FileConflict {
  path: string;
  sources: Array<{ taskId: string; contentHash: string }>;
}

export interface MergeResult {
  action: string;
  name: string;
  template: string;
  description: string;
  files: MergedFile[];
  services: Array<{ instanceId: string; name: string; type: string }>;
  packages: string[];
  conflicts: FileConflict[];
}

interface DeveloperOutput {
  taskId: string;
  content: string;
}

/**
 * Merge parallel developer outputs into a single result.
 * Detects file conflicts (same path from different developers).
 *
 * Conflict resolution: last developer wins, but conflicts are reported.
 */
export function mergeParallelOutputs(outputs: DeveloperOutput[]): MergeResult {
  const result: MergeResult = {
    action: "create_app",
    name: "",
    template: "",
    description: "",
    files: [],
    services: [],
    packages: [],
    conflicts: [],
  };

  // Track files by path for conflict detection
  const filesByPath = new Map<string, Array<{ taskId: string; content: string }>>();
  const seenServiceIds = new Set<string>();
  const seenPackages = new Set<string>();

  for (const output of outputs) {
    const jsonMatch = output.content.match(/```json\s*\n([\s\S]*?)\n```/);
    if (!jsonMatch) continue;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonMatch[1]);
    } catch {
      continue;
    }

    // Extract metadata (take first non-empty values)
    if (!result.name && parsed.name) result.name = parsed.name as string;
    if (!result.template && parsed.template) result.template = parsed.template as string;
    if (!result.description && parsed.description) result.description = parsed.description as string;
    if (parsed.action) result.action = parsed.action as string;

    // Collect files, tracking by path
    const files = parsed.files as Array<{ path: string; content: string }> | undefined;
    if (files && Array.isArray(files)) {
      for (const file of files) {
        if (!filesByPath.has(file.path)) {
          filesByPath.set(file.path, []);
        }
        filesByPath.get(file.path)!.push({
          taskId: output.taskId,
          content: file.content,
        });
      }
    }

    // Collect services (dedup by instanceId)
    const design = parsed.design as Record<string, unknown> | undefined;
    const services = (parsed.requiredServices ||
      design?.services) as
      Array<{ instanceId: string; name: string; type: string }> | undefined;
    if (services && Array.isArray(services)) {
      for (const svc of services) {
        if (svc.instanceId && !seenServiceIds.has(svc.instanceId)) {
          seenServiceIds.add(svc.instanceId);
          result.services.push(svc);
        }
      }
    }

    // Collect packages (dedup)
    const packages = parsed.packages as string[] | undefined;
    if (packages && Array.isArray(packages)) {
      for (const pkg of packages) {
        if (!seenPackages.has(pkg)) {
          seenPackages.add(pkg);
          result.packages.push(pkg);
        }
      }
    }
  }

  // Process files: detect conflicts and resolve (last writer wins)
  for (const [path, sources] of filesByPath) {
    if (sources.length > 1) {
      // Conflict detected
      const conflict: FileConflict = {
        path,
        sources: sources.map((s) => ({
          taskId: s.taskId,
          contentHash: simpleHash(s.content),
        })),
      };

      // Check if all sources have the same content (not a real conflict)
      const uniqueHashes = new Set(conflict.sources.map((s) => s.contentHash));
      if (uniqueHashes.size > 1) {
        result.conflicts.push(conflict);
      }
    }

    // Last writer wins
    const lastSource = sources[sources.length - 1];
    result.files.push({
      path,
      content: lastSource.content,
      sourceTaskId: lastSource.taskId,
    });
  }

  return result;
}

/**
 * Convert merge result back to a JSON code block string
 * compatible with the agent output format.
 */
export function mergeResultToContent(result: MergeResult): string {
  const output = {
    action: result.action,
    name: result.name,
    template: result.template,
    description: result.description,
    files: result.files.map((f) => ({ path: f.path, content: f.content })),
    requiredServices: result.services,
    packages: result.packages,
  };

  return "```json\n" + JSON.stringify(output, null, 2) + "\n```";
}

/**
 * Simple string hash for conflict detection.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}
