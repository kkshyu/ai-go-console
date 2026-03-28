export interface PRDData {
  appName: string;
  description: string;
  targetUsers: string;
  features: string[];
  dataNeeds: string[];
  integrations: string[];
  requiredServices: string[];
}

const PRD_BLOCK_REGEX = /```prd\s*\n([\s\S]*?)\n```/;

/**
 * Extract PRD data from an AI response containing a ```prd JSON block.
 */
export function extractPRD(content: string): PRDData | null {
  const match = content.match(PRD_BLOCK_REGEX);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    return {
      appName: parsed.appName ?? "",
      description: parsed.description ?? "",
      targetUsers: parsed.targetUsers ?? "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
      dataNeeds: Array.isArray(parsed.dataNeeds) ? parsed.dataNeeds : [],
      integrations: Array.isArray(parsed.integrations) ? parsed.integrations : [],
      requiredServices: Array.isArray(parsed.requiredServices) ? parsed.requiredServices : [],
    };
  } catch {
    return null;
  }
}

/**
 * Remove ```prd blocks from content so they don't render in chat.
 */
export function stripPRDBlock(content: string): string {
  return content.replace(/```prd\s*\n[\s\S]*?\n```/g, "").trim();
}

/**
 * Convert PRDData to a user-friendly Markdown document.
 * Excludes requiredServices (technical detail).
 */
export function prdToMarkdown(prd: PRDData): string {
  const lines: string[] = [];

  lines.push("# 需求文件\n");

  lines.push("## 基本資訊");
  if (prd.appName) lines.push(`- **名稱**：${prd.appName}`);
  if (prd.description) lines.push(`- **描述**：${prd.description}`);
  if (prd.targetUsers) lines.push(`- **使用對象**：${prd.targetUsers}`);
  lines.push("");

  if (prd.features.length > 0) {
    lines.push("## 主要功能");
    for (const f of prd.features) lines.push(`- ${f}`);
    lines.push("");
  }

  if (prd.dataNeeds.length > 0) {
    lines.push("## 需要記錄的資料");
    for (const d of prd.dataNeeds) lines.push(`- ${d}`);
    lines.push("");
  }

  if (prd.integrations.length > 0) {
    lines.push("## 額外功能需求");
    for (const i of prd.integrations) lines.push(`- ${i}`);
    lines.push("");
  }

  return lines.join("\n");
}
