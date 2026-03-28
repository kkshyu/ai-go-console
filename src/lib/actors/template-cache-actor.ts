/**
 * Template Cache Background Actor
 *
 * Non-LLM background actor that maintains pre-built template structures.
 * When architect selects a template, this actor provides the full file tree
 * and default configurations so developers don't need to regenerate boilerplate.
 *
 * Dramatically reduces LLM token usage by providing pre-built skeletons.
 */

import { BackgroundActor } from "./background-actor";
import type { BackgroundMessage } from "./types";
import type { BackgroundAgentRole } from "../agents/types";

interface TemplateLookupRequest {
  template: string;
}

interface TemplateFile {
  path: string;
  description: string;
  isOverridable: boolean;  // developer can replace this file
}

interface TemplateStructure {
  name: string;
  description: string;
  fileTree: TemplateFile[];
  builtinDependencies: string[];
  defaultConfig: Record<string, unknown>;
  entryPoint: string;
  devCommand: string;
  buildCommand: string;
}

const TEMPLATES: Record<string, TemplateStructure> = {
  "react-spa": {
    name: "React SPA",
    description: "Single-page React app with Vite + TypeScript",
    fileTree: [
      { path: "src/App.tsx", description: "Main application component", isOverridable: true },
      { path: "src/main.tsx", description: "Application entry point", isOverridable: false },
      { path: "src/index.css", description: "Global styles", isOverridable: true },
      { path: "src/vite-env.d.ts", description: "Vite type declarations", isOverridable: false },
      { path: "index.html", description: "HTML entry", isOverridable: false },
      { path: "vite.config.ts", description: "Vite configuration", isOverridable: false },
      { path: "tsconfig.json", description: "TypeScript configuration", isOverridable: false },
      { path: "package.json", description: "Package manifest", isOverridable: false },
    ],
    builtinDependencies: ["react", "react-dom", "typescript", "vite", "@vitejs/plugin-react"],
    defaultConfig: { port: 5173 },
    entryPoint: "src/main.tsx",
    devCommand: "npm run dev",
    buildCommand: "npm run build",
  },
  "node-api": {
    name: "Node API",
    description: "Express.js REST API with TypeScript",
    fileTree: [
      { path: "src/index.ts", description: "Server entry point", isOverridable: true },
      { path: "src/routes/index.ts", description: "Route definitions", isOverridable: true },
      { path: "tsconfig.json", description: "TypeScript configuration", isOverridable: false },
      { path: "package.json", description: "Package manifest", isOverridable: false },
    ],
    builtinDependencies: ["express", "@types/express", "typescript", "tsx"],
    defaultConfig: { port: 3001 },
    entryPoint: "src/index.ts",
    devCommand: "npm run dev",
    buildCommand: "npm run build",
  },
  "nextjs-fullstack": {
    name: "Next.js Fullstack",
    description: "Full-stack Next.js with App Router + Tailwind",
    fileTree: [
      { path: "src/app/page.tsx", description: "Home page", isOverridable: true },
      { path: "src/app/layout.tsx", description: "Root layout", isOverridable: true },
      { path: "src/app/globals.css", description: "Global styles with Tailwind", isOverridable: true },
      { path: "next.config.ts", description: "Next.js configuration", isOverridable: false },
      { path: "tailwind.config.ts", description: "Tailwind configuration", isOverridable: false },
      { path: "tsconfig.json", description: "TypeScript configuration", isOverridable: false },
      { path: "package.json", description: "Package manifest", isOverridable: false },
    ],
    builtinDependencies: ["next", "react", "react-dom", "typescript", "tailwindcss", "postcss", "autoprefixer"],
    defaultConfig: { port: 3000 },
    entryPoint: "src/app/page.tsx",
    devCommand: "npm run dev",
    buildCommand: "npm run build",
  },
  "line-bot": {
    name: "LINE Bot",
    description: "LINE Bot webhook server with @line/bot-sdk + Express + TypeScript",
    fileTree: [
      { path: "src/index.ts", description: "Webhook server entry point", isOverridable: true },
      { path: "src/handlers/message.ts", description: "Message handler", isOverridable: true },
      { path: "tsconfig.json", description: "TypeScript configuration", isOverridable: false },
      { path: "package.json", description: "Package manifest", isOverridable: false },
    ],
    builtinDependencies: ["express", "@types/express", "@line/bot-sdk", "typescript", "tsx"],
    defaultConfig: { port: 3001 },
    entryPoint: "src/index.ts",
    devCommand: "npm run dev",
    buildCommand: "npm run build",
  },
};

export class TemplateCacheActor extends BackgroundActor {
  constructor(id: string) {
    super(id, "template_cache" as BackgroundAgentRole);
  }

  async process(message: BackgroundMessage): Promise<unknown> {
    const req = message.payload as TemplateLookupRequest;
    return this.lookup(req.template);
  }

  private lookup(templateName: string): TemplateStructure | null {
    return TEMPLATES[templateName] || null;
  }
}
