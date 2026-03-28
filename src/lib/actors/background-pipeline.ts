/**
 * Background Pipeline
 *
 * Chains multiple background agents into a processing pipeline.
 * Output of each stage becomes input to the next stage.
 *
 * Example: FileProcessor → FileAnalyzer → EmbeddingActor
 *   - Stage 1: Extract text from file
 *   - Stage 2: Summarize the extracted text
 *   - Stage 3: Generate embeddings for the summary
 *
 * Supports:
 * - Sequential pipeline (A → B → C)
 * - Fan-out (A → [B1, B2, B3] → merge → C)
 * - Error handling per stage with skip/abort policies
 */

import type { BackgroundActorSystem } from "./background-system";
import type { BackgroundAgentRole } from "../agents/types";
import type { BackgroundMessage } from "./types";

export interface PipelineStage {
  role: BackgroundAgentRole;
  messageType: BackgroundMessage["type"];
  /** Transform the previous stage's output into this stage's input payload. */
  transform?: (prevResult: unknown) => unknown;
  /** If true, failure at this stage skips it instead of aborting the pipeline. */
  optional?: boolean;
  /** Timeout for this stage in ms. */
  timeoutMs?: number;
}

export interface FanOutStage {
  type: "fan_out";
  stages: PipelineStage[];
  /** How to merge results from parallel stages into a single payload. */
  merge: (results: Array<{ role: BackgroundAgentRole; result: unknown; success: boolean }>) => unknown;
}

export type PipelineStep = PipelineStage | FanOutStage;

export interface PipelineResult {
  success: boolean;
  results: Array<{
    role: BackgroundAgentRole;
    result: unknown;
    success: boolean;
    durationMs: number;
  }>;
  finalOutput: unknown;
  totalDurationMs: number;
}

export class BackgroundPipeline {
  private steps: PipelineStep[];
  private system: BackgroundActorSystem;
  private name: string;

  constructor(name: string, system: BackgroundActorSystem, steps: PipelineStep[]) {
    this.name = name;
    this.system = system;
    this.steps = steps;
  }

  /**
   * Execute the pipeline with an initial payload.
   * Each stage's output feeds into the next stage's input.
   */
  async execute(initialPayload: unknown): Promise<PipelineResult> {
    const pipelineStart = Date.now();
    const results: PipelineResult["results"] = [];
    let currentPayload = initialPayload;
    let success = true;

    for (const step of this.steps) {
      if ("type" in step && step.type === "fan_out") {
        // Fan-out: execute all stages in parallel
        const fanOutResult = await this.executeFanOut(step, currentPayload);
        results.push(...fanOutResult.stageResults);

        if (!fanOutResult.success) {
          success = false;
          // Check if all fan-out stages are optional
          const allOptional = step.stages.every((s) => s.optional);
          if (!allOptional) break;
        }

        currentPayload = fanOutResult.mergedOutput;
      } else {
        // Sequential stage
        const stage = step as PipelineStage;
        const stageResult = await this.executeStage(stage, currentPayload);
        results.push(stageResult);

        if (!stageResult.success) {
          if (stage.optional) {
            console.warn(`[Pipeline:${this.name}] Optional stage "${stage.role}" failed, skipping`);
            continue;
          }
          success = false;
          break;
        }

        currentPayload = stageResult.result;
      }
    }

    return {
      success,
      results,
      finalOutput: currentPayload,
      totalDurationMs: Date.now() - pipelineStart,
    };
  }

  private async executeStage(
    stage: PipelineStage,
    input: unknown,
  ): Promise<PipelineResult["results"][number]> {
    const start = Date.now();
    const payload = stage.transform ? stage.transform(input) : input;

    try {
      const result = await this.system.request(
        stage.role,
        stage.messageType,
        payload,
        stage.timeoutMs || 30_000,
      );

      return {
        role: stage.role,
        result,
        success: true,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      return {
        role: stage.role,
        result: err instanceof Error ? err.message : String(err),
        success: false,
        durationMs: Date.now() - start,
      };
    }
  }

  private async executeFanOut(
    fanOut: FanOutStage,
    input: unknown,
  ): Promise<{
    success: boolean;
    stageResults: PipelineResult["results"];
    mergedOutput: unknown;
  }> {
    // Execute all fan-out stages in parallel
    const stageResults = await Promise.all(
      fanOut.stages.map((stage) => this.executeStage(stage, input)),
    );

    const success = stageResults.every((r) => r.success || fanOut.stages.find(
      (s) => s.role === r.role
    )?.optional);

    // Merge results
    const mergeInput = stageResults.map((r) => ({
      role: r.role,
      result: r.result,
      success: r.success,
    }));

    const mergedOutput = fanOut.merge(mergeInput);

    return { success, stageResults, mergedOutput };
  }
}

// ---- Pre-built Pipeline Definitions ----

/**
 * Create a file processing pipeline:
 * FileProcessor (extract text) → FileAnalyzer (summarize) → Embedding (vectorize)
 */
export function createFileProcessingPipeline(
  system: BackgroundActorSystem,
  conversationId: string,
): BackgroundPipeline {
  return new BackgroundPipeline("file-processing", system, [
    {
      role: "file_processor" as BackgroundAgentRole,
      messageType: "process_file" as BackgroundMessage["type"],
      timeoutMs: 30_000,
    },
    {
      role: "file_analyzer" as BackgroundAgentRole,
      messageType: "analyze_file" as BackgroundMessage["type"],
      transform: (prevResult) => {
        const result = prevResult as { fileId: string; extractedText: string };
        return {
          fileId: result.fileId,
          extractedText: result.extractedText,
          fileName: "",
          storagePath: "",
          mimeType: "",
        };
      },
      optional: true, // Summary is nice-to-have
      timeoutMs: 30_000,
    },
    {
      role: "embedding" as BackgroundAgentRole,
      messageType: "embed_request" as BackgroundMessage["type"],
      transform: (prevResult) => {
        const result = prevResult as { fileId: string; summary?: string; extractedText?: string };
        return {
          sourceType: "file",
          sourceId: result.fileId,
          conversationId,
          agentRole: "file_processor",
          content: result.summary || result.extractedText || "",
        };
      },
      optional: true, // Embedding failure shouldn't break the pipeline
      timeoutMs: 15_000,
    },
  ]);
}

/**
 * Create a code validation pipeline:
 * CodeValidator (syntax check) → DependencyResolver (package check)
 */
export function createCodeValidationPipeline(
  system: BackgroundActorSystem,
): BackgroundPipeline {
  return new BackgroundPipeline("code-validation", system, [
    {
      role: "code_validator" as BackgroundAgentRole,
      messageType: "validate_code" as BackgroundMessage["type"],
      timeoutMs: 10_000,
    },
    {
      role: "dependency_resolver" as BackgroundAgentRole,
      messageType: "resolve_deps" as BackgroundMessage["type"],
      transform: (prevResult) => {
        // Extract package names from validated content
        const result = prevResult as { pass: boolean; packages?: string[] };
        return { packages: result.packages || [] };
      },
      optional: true,
      timeoutMs: 15_000,
    },
  ]);
}
