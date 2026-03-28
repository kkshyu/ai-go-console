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
import * as sandbox from "@/lib/k8s/sandbox";


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
 * Generates an app inside a Docker container from a template base image.
 * Template files are rendered in memory and injected via docker cp.
 */
export async function generateApp(options: GenerateAppOptions): Promise<string> {
  const { appId, slug, orgSlug, name, description, template, port, prodPort } = options;

  const tmpl = getTemplate(template);
  if (!tmpl) {
    throw new Error(`Template "${template}" not found`);
  }

  // Remove existing container if present (re-generation)
  await sandbox.removeDevContainer(orgSlug, slug);

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

  // Render all template files in memory
  const renderedFiles = await renderTemplateFiles(tmpl.directory, context);

  // Merge custom files from developer agent / import
  if (options.files && options.files.length > 0) {
    // If custom files include a package.json, merge it with the template's version
    const customPkgFile = options.files.find((f) => f.path === "package.json");
    const templatePkgIdx = renderedFiles.findIndex((f) => f.path === "package.json");

    if (customPkgFile && templatePkgIdx >= 0) {
      try {
        const templatePkg = JSON.parse(renderedFiles[templatePkgIdx].content);
        const customPkg = JSON.parse(customPkgFile.content);

        // Merge: custom dependencies take priority, but preserve template scripts
        const merged = { ...templatePkg };

        // Use custom name/description if present
        if (customPkg.name) merged.name = customPkg.name;
        if (customPkg.description) merged.description = customPkg.description;

        // Merge scripts: template scripts as base, custom scripts override
        merged.scripts = { ...templatePkg.scripts, ...customPkg.scripts };

        // Merge dependencies: custom deps take priority
        merged.dependencies = {
          ...templatePkg.dependencies,
          ...customPkg.dependencies,
        };

        // Merge devDependencies: custom devDeps take priority
        merged.devDependencies = {
          ...templatePkg.devDependencies,
          ...customPkg.devDependencies,
        };

        renderedFiles[templatePkgIdx].content = JSON.stringify(merged, null, 2);
      } catch {
        // If JSON parsing fails, just use the custom package.json as-is
        renderedFiles[templatePkgIdx] = customPkgFile;
      }
    }

    // Merge all other files (overwrite template files if same path)
    for (const file of options.files) {
      if (file.path === "package.json") continue; // Already handled above
      const existingIdx = renderedFiles.findIndex((f) => f.path === file.path);
      if (existingIdx >= 0) {
        renderedFiles[existingIdx] = file;
      } else {
        renderedFiles.push(file);
      }
    }
  }

  // Add extra npm packages to the rendered package.json
  if (options.npmPackages && options.npmPackages.length > 0) {
    const pkgIdx = renderedFiles.findIndex((f) => f.path === "package.json");
    if (pkgIdx >= 0) {
      const pkg = JSON.parse(renderedFiles[pkgIdx].content);
      if (!pkg.dependencies) pkg.dependencies = {};
      for (const pkgName of options.npmPackages) {
        if (!pkg.dependencies[pkgName]) {
          pkg.dependencies[pkgName] = "latest";
        }
      }
      renderedFiles[pkgIdx].content = JSON.stringify(pkg, null, 2);
    }
  }

  // Build app-specific dev image (or tag base image)
  if (options.npmPackages && options.npmPackages.length > 0) {
    await sandbox.buildAppDevImage(orgSlug, slug, template, options.npmPackages);
  } else {
    await sandbox.tagBaseImage(orgSlug, slug, template);
  }

  // Create the dev container with service env vars
  await sandbox.createDevContainer(orgSlug, slug, template, port, envVars);

  // Inject all rendered files into the container
  await sandbox.writeFiles(orgSlug, slug, renderedFiles);

  return sandbox.devContainerName(orgSlug, slug);
}

/**
 * Recursively renders all files from a template directory through Handlebars.
 * Returns files as in-memory array instead of writing to disk.
 */
async function renderTemplateFiles(
  srcDir: string,
  context: Record<string, unknown>,
  basePath = ""
): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    let destName = entry.name;
    let isTemplate = false;

    // Strip .hbs extension
    if (destName.endsWith(".hbs")) {
      destName = destName.slice(0, -4);
      isTemplate = true;
    }

    const relativePath = basePath ? `${basePath}/${destName}` : destName;

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      const subFiles = await renderTemplateFiles(srcPath, context, relativePath);
      files.push(...subFiles);
    } else {
      const rawContent = await fsp.readFile(srcPath, "utf-8");
      const content = isTemplate
        ? Handlebars.compile(rawContent)(context)
        : rawContent;
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

/**
 * Resolve service env vars for an app from the database.
 */
export async function resolveServiceEnvVars(appId: string): Promise<Record<string, string>> {
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
 * Removes an app's dev container and image.
 */
export async function removeApp(orgSlug: string, slug: string): Promise<void> {
  await sandbox.removeDevContainer(orgSlug, slug);
  await sandbox.removeDevImage(orgSlug, slug);
}

/**
 * Returns the dev container name for an app.
 */
export function getContainerName(orgSlug: string, slug: string): string {
  return sandbox.devContainerName(orgSlug, slug);
}
