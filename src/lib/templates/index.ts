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

/* ---------- Next.js shared config ---------- */
const NEXTJS_BASE = {
  defaultPort: 3000,
  devCommand: "npx",
  devArgs: ["next", "dev", "--turbopack"],
  installCommand: "npm",
  installArgs: ["install"],
  internalDevPort: 3000,
};

/* ---------- LINE Bot shared config ---------- */
const LINEBOT_BASE = {
  defaultPort: 3000,
  devCommand: "npx",
  devArgs: ["tsx", "watch", "src/index.ts"],
  installCommand: "npm",
  installArgs: ["install"],
  internalDevPort: 3000,
};

export const templates: Record<string, TemplateDefinition> = {
  /* ===== Legacy templates (kept for backward compatibility) ===== */
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
    ...LINEBOT_BASE,
    devBaseImage: "aigo-dev-base-node-api",
  },
  "nextjs-fullstack": {
    id: "nextjs-fullstack",
    name: "Next.js Full-Stack",
    description: "Full-stack Next.js application with App Router and Tailwind",
    directory: path.join(TEMPLATES_ROOT, "nextjs-fullstack"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-nextjs-fullstack",
  },
  "line-bot": {
    id: "line-bot",
    name: "LINE Bot",
    description: "LINE Bot webhook server with @line/bot-sdk, Express, and TypeScript",
    directory: path.join(TEMPLATES_ROOT, "line-bot"),
    ...LINEBOT_BASE,
    devBaseImage: "aigo-dev-base-line-bot",
  },

  /* ===== New system-type templates ===== */
  crm: {
    id: "crm",
    name: "客戶管理 CRM",
    description: "客戶關係管理系統，含 recharts 圖表與 date-fns",
    directory: path.join(TEMPLATES_ROOT, "crm"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-crm",
  },
  erp: {
    id: "erp",
    name: "進銷存 ERP",
    description: "進銷存管理系統，含 recharts 圖表與 date-fns",
    directory: path.join(TEMPLATES_ROOT, "erp"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-erp",
  },
  linebot: {
    id: "linebot",
    name: "LINE Bot",
    description: "LINE 聊天機器人，含 @line/bot-sdk、Express",
    directory: path.join(TEMPLATES_ROOT, "linebot"),
    ...LINEBOT_BASE,
    devBaseImage: "aigo-dev-base-linebot",
  },
  website: {
    id: "website",
    name: "形象網頁",
    description: "企業形象網站，Next.js + Tailwind CSS",
    directory: path.join(TEMPLATES_ROOT, "website"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-website",
  },
  ecommerce: {
    id: "ecommerce",
    name: "電商平台",
    description: "線上購物平台，含 zustand 狀態管理與 date-fns",
    directory: path.join(TEMPLATES_ROOT, "ecommerce"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-ecommerce",
  },
  booking: {
    id: "booking",
    name: "預約系統",
    description: "預約/訂位管理系統，含 date-fns",
    directory: path.join(TEMPLATES_ROOT, "booking"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-booking",
  },
  internal: {
    id: "internal",
    name: "內部工具",
    description: "企業內部管理工具，含 recharts 圖表與 date-fns",
    directory: path.join(TEMPLATES_ROOT, "internal"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-internal",
  },
  dashboard: {
    id: "dashboard",
    name: "儀表板",
    description: "營運數據分析儀表板，含 recharts 圖表與 date-fns",
    directory: path.join(TEMPLATES_ROOT, "dashboard"),
    ...NEXTJS_BASE,
    devBaseImage: "aigo-dev-base-dashboard",
  },
  blank: {
    id: "blank",
    name: "Blank (User Files)",
    description: "Minimal container for user-provided project files",
    directory: path.join(TEMPLATES_ROOT, "blank"),
    defaultPort: 3000,
    devCommand: "sh",
    devArgs: ["-c", "if [ -f package.json ]; then npm install && npm run dev; else npx -y serve -s -l 3000 .; fi"],
    installCommand: "npm",
    installArgs: ["install"],
    internalDevPort: 3000,
    devBaseImage: "node:22-alpine",
  },
};

export function getTemplate(id: string): TemplateDefinition | undefined {
  return templates[id];
}

export function listTemplates(): TemplateDefinition[] {
  return Object.values(templates);
}
