import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import Handlebars from "handlebars";
import { getTemplate } from "@/lib/templates";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { generateProxyToken } from "@/lib/proxy-token";
import {
  toScreamingSnake,
  SERVICE_TYPE_HTTP_MODE,
  FIXED_ENDPOINT_URLS,
} from "@/lib/service-types";
import type { ServiceType } from "@prisma/client";

const APPS_ROOT = path.join(process.cwd(), "apps");

export interface GenerateAppOptions {
  slug: string;
  name: string;
  description?: string;
  template: string;
  port: number;
  serviceIds?: string[];
}

/**
 * Generates an app from a template into apps/<slug>/
 */
export async function generateApp(options: GenerateAppOptions): Promise<string> {
  const { slug, name, description, template, port, serviceIds } = options;

  const tmpl = getTemplate(template);
  if (!tmpl) {
    throw new Error(`Template "${template}" not found`);
  }

  const appDir = path.join(APPS_ROOT, slug);

  // Ensure apps directory exists
  await fsp.mkdir(APPS_ROOT, { recursive: true });

  // Remove existing directory if present (re-generation)
  if (fs.existsSync(appDir)) {
    await fsp.rm(appDir, { recursive: true, force: true });
  }

  // Resolve environment variables from linked services
  const envVars: Record<string, string> = {};
  if (serviceIds && serviceIds.length > 0) {
    const appServices = await prisma.appService.findMany({
      where: {
        appId: slug,
        serviceId: { in: serviceIds },
      },
      include: { service: true },
    });

    const consolePort = process.env.PORT || "3000";

    for (const as_ of appServices) {
      const svc = as_.service;
      const config = JSON.parse(
        decrypt(svc.configEncrypted, svc.iv, svc.authTag)
      );
      const prefix = as_.envVarPrefix;
      const httpMode = SERVICE_TYPE_HTTP_MODE[svc.type as ServiceType];

      // Inject endpoint URL based on httpMode
      switch (httpMode) {
        case "proxy":
          // Auto-generate proxy URL and token — user doesn't provide endpoint
          envVars[`${prefix}_ENDPOINT_URL`] =
            `http://host.docker.internal:${consolePort}/api/proxy/${svc.id}/query`;
          envVars[`${prefix}_API_TOKEN`] = generateProxyToken(svc.id);
          break;
        case "fixed": {
          // Use well-known API URL
          const fixedUrl = FIXED_ENDPOINT_URLS[svc.type as ServiceType];
          if (fixedUrl) envVars[`${prefix}_ENDPOINT_URL`] = fixedUrl;
          break;
        }
        case "user-provided":
          // User provides the endpoint URL
          if (svc.endpointUrl) envVars[`${prefix}_ENDPOINT_URL`] = svc.endpointUrl;
          break;
        case "sdk":
          // No endpoint URL — app uses SDK with config credentials
          break;
      }

      // Always inject all config fields as env vars
      for (const [key, value] of Object.entries(config)) {
        if (value) {
          envVars[`${prefix}_${toScreamingSnake(key)}`] = String(value);
        }
      }
    }
  }

  // Template context for Handlebars
  const context = {
    name,
    slug,
    description: description || "",
    port,
    envVars,
  };

  // Copy and render template files
  await copyDirectory(tmpl.directory, appDir, context);

  return appDir;
}

/**
 * Recursively copies a directory, rendering .hbs files through Handlebars
 */
async function copyDirectory(
  src: string,
  dest: string,
  context: Record<string, unknown>
): Promise<void> {
  await fsp.mkdir(dest, { recursive: true });

  const entries = await fsp.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    let destName = entry.name;
    let isTemplate = false;

    // Strip .hbs extension
    if (destName.endsWith(".hbs")) {
      destName = destName.slice(0, -4);
      isTemplate = true;
    }

    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      // Skip node_modules if present in template
      if (entry.name === "node_modules") continue;
      await copyDirectory(srcPath, destPath, context);
    } else {
      if (isTemplate) {
        // Render through Handlebars
        const content = await fsp.readFile(srcPath, "utf-8");
        const compiled = Handlebars.compile(content);
        const rendered = compiled(context);
        await fsp.writeFile(destPath, rendered, "utf-8");
      } else {
        // Copy as-is
        await fsp.copyFile(srcPath, destPath);
      }
    }
  }
}

/**
 * Removes an app directory
 */
export async function removeApp(slug: string): Promise<void> {
  const appDir = path.join(APPS_ROOT, slug);
  if (fs.existsSync(appDir)) {
    await fsp.rm(appDir, { recursive: true, force: true });
  }
}

/**
 * Returns the absolute path for an app
 */
export function getAppPath(slug: string): string {
  return path.join(APPS_ROOT, slug);
}
