/**
 * Post-Processor
 *
 * Handles side effects after an agent produces output:
 * - File operations (writing to Docker containers)
 * - Service binding (authorization + binding)
 *
 * Extracted from PMActor to keep it focused on orchestration logic.
 */

import { executeFileOperations } from "../services/file-operations";
import {
  extractServicesFromContent,
  getAuthorizedServiceIds,
  bindServicesToApp,
} from "../services/service-authorization";
import { actorLog } from "./logger";

export interface PostProcessorConfig {
  appSlug?: string;
  appId?: string;
  userId?: string;
  orgSlug?: string;
  serviceInstances: Array<{ id: string; name: string; type: string }>;
  sendEvent: (data: unknown) => Promise<void>;
  traceId?: string;
}

export class PostProcessor {
  private config: PostProcessorConfig;

  constructor(config: PostProcessorConfig) {
    this.config = config;
  }

  /**
   * Parse agent output and write files directly to the Docker container.
   */
  async executeFileOperations(content: string): Promise<void> {
    if (!this.config.appSlug) return;

    try {
      const result = await executeFileOperations(
        content,
        this.config.orgSlug || "default",
        this.config.appSlug,
      );
      if (result) {
        await this.config.sendEvent({
          filesWritten: {
            count: result.filesWritten,
            paths: result.paths,
          },
        });
      }
    } catch (err) {
      actorLog(
        "warn",
        "post-processor",
        `Failed to write files: ${err instanceof Error ? err.message : "Unknown error"}`,
        this.config.traceId,
      );
    }
  }

  /**
   * Extract services from agent output, authorize, and bind to app.
   */
  async bindServices(content: string): Promise<void> {
    if (!this.config.appId) return;

    try {
      const services = extractServicesFromContent(content);
      if (services.length === 0) return;

      const authorizedIds = await getAuthorizedServiceIds(
        this.config.userId,
        this.config.serviceInstances,
      );

      const result = await bindServicesToApp(
        this.config.appId,
        services,
        authorizedIds,
      );

      if (result.unauthorized && result.unauthorized.length > 0) {
        await this.config.sendEvent({
          pmMessage: `您沒有使用以下服務的權限：${result.unauthorized.join(", ")}。請聯繫管理員取得授權。`,
          agentRole: "pm",
        });
        return;
      }

      if (result.bound > 0) {
        await this.config.sendEvent({
          servicesBound: { count: result.bound, names: result.names.join(", ") },
        });
      }
    } catch (err) {
      actorLog(
        "warn",
        "post-processor",
        `Failed to bind services: ${err instanceof Error ? err.message : "Unknown error"}`,
        this.config.traceId,
      );
    }
  }

  /**
   * Run all post-processing steps for agent output.
   */
  async process(content: string): Promise<void> {
    await this.executeFileOperations(content);
    await this.bindServices(content);
  }
}
