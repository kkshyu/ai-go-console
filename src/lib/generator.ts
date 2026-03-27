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
  appId: string;
  slug: string;
  orgSlug: string;
  name: string;
  description?: string;
  template: string;
  port: number;
  prodPort: number;
  files?: Array<{ path: string; content: string }>;
  npmPackages?: string[];
}

/**
 * Generates an app from a template into apps/<slug>/
 */
export async function generateApp(options: GenerateAppOptions): Promise<string> {
  const { appId, slug, orgSlug, name, description, template, port, prodPort } = options;

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
  const envVars = await resolveServiceEnvVars(appId);

  // Template context for Handlebars
  const context = {
    name,
    slug,
    orgSlug,
    description: description || "",
    port,
    prodPort,
    envVars,
  };

  // Copy and render template files
  await copyDirectory(tmpl.directory, appDir, context);

  // Write custom files from developer agent (overwrite template files if same path)
  if (options.files && options.files.length > 0) {
    for (const file of options.files) {
      const filePath = path.join(appDir, file.path);
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, file.content, "utf-8");
    }
  }

  // Add extra npm packages to package.json
  if (options.npmPackages && options.npmPackages.length > 0) {
    const pkgPath = path.join(appDir, "package.json");
    const pkg = JSON.parse(await fsp.readFile(pkgPath, "utf-8"));
    if (!pkg.dependencies) pkg.dependencies = {};
    for (const pkgName of options.npmPackages) {
      if (!pkg.dependencies[pkgName]) {
        pkg.dependencies[pkgName] = "latest";
      }
    }
    await fsp.writeFile(pkgPath, JSON.stringify(pkg, null, 2), "utf-8");
  }

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
 * Resolve service env vars for an app from the database.
 */
async function resolveServiceEnvVars(appId: string): Promise<Record<string, string>> {
  const envVars: Record<string, string> = {};

  const appServices = await prisma.appService.findMany({
    where: { appId },
    include: { service: true },
  });

  if (appServices.length === 0) return envVars;

  const consolePort = process.env.PORT || "3000";

  for (const as_ of appServices) {
    const svc = as_.service;
    const config = JSON.parse(
      decrypt(svc.configEncrypted, svc.iv, svc.authTag)
    );
    const prefix = as_.envVarPrefix;
    const httpMode = SERVICE_TYPE_HTTP_MODE[svc.type as ServiceType];

    switch (httpMode) {
      case "proxy":
        envVars[`${prefix}_ENDPOINT_URL`] =
          `http://host.docker.internal:${consolePort}/api/proxy/${svc.id}/query`;
        envVars[`${prefix}_API_TOKEN`] = generateProxyToken(svc.id);
        break;
      case "fixed": {
        const fixedUrl = FIXED_ENDPOINT_URLS[svc.type as ServiceType];
        if (fixedUrl) envVars[`${prefix}_ENDPOINT_URL`] = fixedUrl;
        break;
      }
      case "user-provided":
        if (svc.endpointUrl) envVars[`${prefix}_ENDPOINT_URL`] = svc.endpointUrl;
        break;
      case "sdk":
        break;
    }

    for (const [key, value] of Object.entries(config)) {
      if (value) {
        envVars[`${prefix}_${toScreamingSnake(key)}`] = String(value);
      }
    }
  }

  return envVars;
}

/**
 * Regenerate only the docker-compose.yml for an app,
 * picking up the latest service bindings without wiping app code.
 */
export async function regenerateCompose(appId: string, slug: string, orgSlug: string, template: string, prodPort: number): Promise<void> {
  const tmpl = getTemplate(template);
  if (!tmpl) throw new Error(`Template "${template}" not found`);

  const composeSrc = path.join(tmpl.directory, "docker-compose.yml.hbs");
  if (!fs.existsSync(composeSrc)) return;

  const envVars = await resolveServiceEnvVars(appId);
  const context = { slug, orgSlug, prodPort, envVars };

  const content = await fsp.readFile(composeSrc, "utf-8");
  const compiled = Handlebars.compile(content);
  const rendered = compiled(context);

  const appDir = path.join(APPS_ROOT, slug);
  await fsp.writeFile(path.join(appDir, "docker-compose.yml"), rendered, "utf-8");
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
