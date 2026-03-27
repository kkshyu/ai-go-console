import path from "node:path";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  directory: string;
  defaultPort: number;
  devCommand: string;
  devArgs: string[];
  installCommand: string;
  installArgs: string[];
  /** Port the dev server listens on inside the Docker container */
  internalDevPort: number;
  /** Docker base image name for dev containers */
  devBaseImage: string;
}

const TEMPLATES_ROOT = path.join(process.cwd(), "templates");

export const templates: Record<string, TemplateDefinition> = {
  "react-spa": {
    id: "react-spa",
    name: "React SPA",
    description: "Single-page React application with Vite and TypeScript",
    directory: path.join(TEMPLATES_ROOT, "react-spa"),
    defaultPort: 5173,
    devCommand: "npx",
    devArgs: ["vite", "--host", "0.0.0.0"],
    installCommand: "npm",
    installArgs: ["install"],
    internalDevPort: 5173,
    devBaseImage: "aigo-dev-base-react-spa",
  },
  "node-api": {
    id: "node-api",
    name: "Node.js API",
    description: "Express.js REST API with TypeScript",
    directory: path.join(TEMPLATES_ROOT, "node-api"),
    defaultPort: 3000,
    devCommand: "npx",
    devArgs: ["tsx", "watch", "src/index.ts"],
    installCommand: "npm",
    installArgs: ["install"],
    internalDevPort: 3000,
    devBaseImage: "aigo-dev-base-node-api",
  },
  "nextjs-fullstack": {
    id: "nextjs-fullstack",
    name: "Next.js Full-Stack",
    description: "Full-stack Next.js application with App Router and Tailwind",
    directory: path.join(TEMPLATES_ROOT, "nextjs-fullstack"),
    defaultPort: 3000,
    devCommand: "npx",
    devArgs: ["next", "dev", "--turbopack"],
    installCommand: "npm",
    installArgs: ["install"],
    internalDevPort: 3000,
    devBaseImage: "aigo-dev-base-nextjs-fullstack",
  },
  "line-bot": {
    id: "line-bot",
    name: "LINE Bot",
    description:
      "LINE Bot webhook server with @line/bot-sdk, Express, and TypeScript",
    directory: path.join(TEMPLATES_ROOT, "line-bot"),
    defaultPort: 3000,
    devCommand: "npx",
    devArgs: ["tsx", "watch", "src/index.ts"],
    installCommand: "npm",
    installArgs: ["install"],
    internalDevPort: 3000,
    devBaseImage: "aigo-dev-base-line-bot",
  },
};

export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates[id];
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(templates);
}
