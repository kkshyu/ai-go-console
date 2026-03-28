#!/usr/bin/env node
/**
 * Multi-Agent App Creation E2E Test Script
 *
 * Tests the full multi-agent pipeline for creating different types of applications:
 *   1. Login & session management
 *   2. POST /api/chat/multi-agent with SSE streaming
 *   3. Track agent orchestration flow (PM → Architect → Developer → Reviewer → DevOps)
 *   4. Verify create_app action is produced
 *   5. POST /api/apps to actually create the app
 *   6. Verify app exists in DB and filesystem
 *   7. Cleanup
 *
 * Usage:
 *   node test-multi-agent-apps.mjs                    # Run all test cases
 *   node test-multi-agent-apps.mjs --case todo        # Run single case by key
 *   node test-multi-agent-apps.mjs --case todo,crm    # Run specific cases
 *   node test-multi-agent-apps.mjs --timeout 300000   # Custom timeout (ms)
 *   node test-multi-agent-apps.mjs --verbose          # Show raw SSE events
 */

import fs from "node:fs";
import path from "node:path";

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const API_MULTI_AGENT = `${BASE_URL}/api/chat/multi-agent`;
const API_APPS = `${BASE_URL}/api/apps`;
const DISPLAY_TIMEOUT_MS = 5000; // warn if no event for 5s
const DEFAULT_TOTAL_TIMEOUT_MS = 180_000; // 3 min per test case

// ─── Test Cases ─────────────────────────────────────────────────────────────

const TEST_CASES = {
  todo: {
    name: "待辦事項應用 (Todo App)",
    prompt: "建立一個待辦事項管理應用，需要有新增、編輯、刪除和完成功能",
    expectedTemplate: "nextjs-fullstack",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests basic CRUD app generation with standard agent flow",
  },
  dashboard: {
    name: "數據儀表板 (Dashboard)",
    prompt: "建立一個數據分析儀表板，顯示銷售統計圖表和即時數據",
    expectedTemplate: "dashboard",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests dashboard template with data visualization requirements",
  },
  ecommerce: {
    name: "電商網站 (E-commerce)",
    prompt: "建立一個簡易電商平台，有商品列表、購物車和結帳功能",
    expectedTemplate: "ecommerce",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests complex app with multiple features and service integrations",
  },
  api: {
    name: "REST API 服務 (Node API)",
    prompt: "建立一個 RESTful API 服務，提供使用者管理的 CRUD 端點",
    expectedTemplate: "node-api",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests backend-only API service generation",
  },
  landing: {
    name: "行銷著陸頁 (Landing Page)",
    prompt: "建立一個產品行銷著陸頁，有 hero section、功能介紹和 CTA 按鈕",
    expectedTemplate: "website",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests static website template with marketing focus",
  },
  booking: {
    name: "預約系統 (Booking)",
    prompt: "建立一個預約排程系統，讓客戶可以線上預約時段",
    expectedTemplate: "booking",
    expectedAgents: ["pm", "architect", "developer"],
    description: "Tests booking template with calendar/scheduling features",
  },
};

// ─── CLI Argument Parsing ───────────────────────────────────────────────────

const args = process.argv.slice(2);
let selectedCases = Object.keys(TEST_CASES);
let totalTimeoutMs = DEFAULT_TOTAL_TIMEOUT_MS;
let verbose = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--case" && args[i + 1]) {
    selectedCases = args[i + 1].split(",").map((s) => s.trim());
    i++;
  } else if (args[i] === "--timeout" && args[i + 1]) {
    totalTimeoutMs = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--verbose") {
    verbose = true;
  }
}

// Validate selected cases
for (const c of selectedCases) {
  if (!TEST_CASES[c]) {
    console.error(`Unknown test case: "${c}". Available: ${Object.keys(TEST_CASES).join(", ")}`);
    process.exit(1);
  }
}

// ─── Utilities ──────────────────────────────────────────────────────────────

const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(color, icon, msg) {
  console.log(`${color}${icon}${colors.reset} ${msg}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${"═".repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${"═".repeat(60)}${colors.reset}\n`);
}

function logSubsection(title) {
  console.log(`\n${colors.bold}  ── ${title} ──${colors.reset}\n`);
}

// ─── Auth ───────────────────────────────────────────────────────────────────

async function login(email, password) {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  const cookies = {};
  for (const header of csrfRes.headers.getSetCookie?.() || []) {
    const [kv] = header.split(";");
    const [k, v] = kv.split("=");
    cookies[k.trim()] = v.trim();
  }

  // 2. Sign in
  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    json: "true",
  });

  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStr,
    },
    body: params.toString(),
    redirect: "manual",
  });

  for (const header of signInRes.headers.getSetCookie?.() || []) {
    const [kv] = header.split(";");
    const [k, v] = kv.split("=");
    cookies[k.trim()] = v.trim();
  }

  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function getUserId(cookie) {
  const res = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: cookie },
  });
  const session = await res.json();
  return session?.user?.id;
}

// ─── SSE Stream Parser ─────────────────────────────────────────────────────

/**
 * Send a prompt to the multi-agent API and parse the SSE stream.
 * Returns a structured result with all agent events, orchestration state, etc.
 */
async function runMultiAgentChat(cookie, prompt, timeoutMs) {
  const result = {
    success: false,
    streamCompleted: false,
    totalEvents: 0,
    agentCompletions: [],       // { agent, rawContent }
    agentSequence: [],          // ordered list of agents that ran
    displayMessages: [],        // { agent, content }
    statusUpdates: [],          // string[]
    errors: [],                 // string[]
    createAppConfig: null,      // parsed create_app JSON if found
    orchestrationState: null,   // final orch state
    conversationId: null,
    timeoutWarnings: 0,
    duration: 0,
    tokenUsage: { total: 0 },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const res = await fetch(API_MULTI_AGENT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      result.errors.push(`API returned ${res.status}: ${text.slice(0, 200)}`);
      return result;
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      result.errors.push(`Expected SSE, got: ${contentType}`);
      return result;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let currentAgent = null;
    let lastEventTime = Date.now();

    // Timeout monitor
    const timeoutChecker = setInterval(() => {
      const elapsed = Date.now() - lastEventTime;
      if (elapsed > DISPLAY_TIMEOUT_MS && !result.streamCompleted) {
        result.timeoutWarnings++;
        if (verbose) {
          log(colors.yellow, "  ⚠", `No event for ${(elapsed / 1000).toFixed(1)}s (agent: ${currentAgent || "?"})`);
        }
      }
    }, 1000);

    // Read SSE stream
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();

        if (data === "[DONE]") {
          result.streamCompleted = true;
          continue;
        }

        let parsed;
        try {
          parsed = JSON.parse(data);
          if (parsed === "[DONE]") {
            result.streamCompleted = true;
            continue;
          }
        } catch {
          continue;
        }

        lastEventTime = Date.now();
        result.totalEvents++;

        // ConversationId
        if (parsed.conversationId && !parsed.agentRole) {
          result.conversationId = parsed.conversationId;
        }

        // Agent metadata (new agent starts working)
        if (parsed.agentRole && parsed.orchestrationState) {
          currentAgent = parsed.agentRole;
          result.orchestrationState = parsed.orchestrationState;

          if (!result.agentSequence.includes(parsed.agentRole)) {
            result.agentSequence.push(parsed.agentRole);
          }

          log(colors.blue, "  🤖", `${parsed.agentRole.toUpperCase()} started (status: ${parsed.orchestrationState.status})`);
        }

        // Status update from PM
        if (parsed.statusUpdate) {
          result.statusUpdates.push(parsed.statusUpdate);
          log(colors.magenta, "  📌", parsed.statusUpdate);
        }

        // Thinking indicator
        if (parsed.thinking && verbose) {
          log(colors.dim, "  💭", `${parsed.agentRole || currentAgent} thinking...`);
        }

        // Display content
        if (parsed.content && !parsed.orchestrationState) {
          const preview = parsed.content.length > 120
            ? parsed.content.slice(0, 120) + "..."
            : parsed.content;
          result.displayMessages.push({
            agent: parsed.agentRole || currentAgent,
            content: parsed.content,
          });
          if (verbose) {
            log(colors.dim, "  📝", `[${parsed.agentRole || currentAgent}] ${preview}`);
          }
        }

        // Agent complete
        if (parsed.agentComplete) {
          result.agentCompletions.push({
            agent: parsed.agentRole || currentAgent,
            rawContent: parsed.rawContent,
          });
          log(colors.green, "  ✅", `${(parsed.agentRole || currentAgent).toUpperCase()} completed`);

          if (parsed.orchestrationState) {
            result.orchestrationState = parsed.orchestrationState;
          }

          // Check for create_app action
          if (parsed.rawContent?.includes('"create_app"')) {
            const match = parsed.rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
            if (match) {
              try {
                result.createAppConfig = JSON.parse(match[1]);
                log(colors.green, "  🎯", `create_app found! template: ${result.createAppConfig.template || "?"}`);
              } catch {}
            }
          }
        }

        // Token usage
        if (parsed.usage) {
          result.tokenUsage.total += parsed.usage.totalTokens || 0;
        }

        // Error
        if (parsed.error) {
          result.errors.push(parsed.error);
          log(colors.red, "  ❌", parsed.error);
        }
      }
    }

    clearInterval(timeoutChecker);
    result.success = result.streamCompleted && result.errors.length === 0;
    result.duration = Date.now() - startTime;
  } catch (err) {
    if (err.name === "AbortError") {
      result.errors.push(`Timed out after ${timeoutMs / 1000}s`);
    } else {
      result.errors.push(err.message);
    }
  } finally {
    clearTimeout(timeout);
  }

  return result;
}

// ─── App Creation via API ───────────────────────────────────────────────────

async function createAppFromConfig(cookie, userId, config) {
  const payload = {
    name: config.name || config.appName,
    template: config.template,
    description: config.description,
    slug: config.slug,
    userId,
    files: config.files,
    npmPackages: config.npmPackages,
    serviceIds: config.serviceIds,
  };

  const res = await fetch(API_APPS, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  return { status: res.status, body };
}

async function deleteApp(cookie, appId) {
  try {
    await fetch(`${API_APPS}/${appId}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
  } catch {}
}

// ─── Verification ───────────────────────────────────────────────────────────

function verifyAgentFlow(result, expectedAgents) {
  const checks = [];

  // 1. Stream completed
  checks.push({
    name: "SSE stream completed",
    pass: result.streamCompleted,
    detail: result.streamCompleted ? "OK" : "Stream did not send [DONE]",
  });

  // 2. No errors
  checks.push({
    name: "No errors in stream",
    pass: result.errors.length === 0,
    detail: result.errors.length === 0 ? "OK" : result.errors.join("; "),
  });

  // 3. Expected agents participated
  for (const agent of expectedAgents) {
    const found = result.agentSequence.includes(agent);
    checks.push({
      name: `Agent "${agent}" participated`,
      pass: found,
      detail: found ? "OK" : `Not found in sequence: [${result.agentSequence.join(", ")}]`,
    });
  }

  // 4. At least one agent completion
  checks.push({
    name: "At least one agent completed",
    pass: result.agentCompletions.length > 0,
    detail: `${result.agentCompletions.length} completions`,
  });

  // 5. Display messages produced
  checks.push({
    name: "Display messages produced",
    pass: result.displayMessages.length > 0,
    detail: `${result.displayMessages.length} messages`,
  });

  // 6. Orchestration reached completed status
  const orchStatus = result.orchestrationState?.status;
  checks.push({
    name: "Orchestration completed",
    pass: orchStatus === "completed",
    detail: `Final status: ${orchStatus || "null"}`,
  });

  // 7. create_app action found
  checks.push({
    name: "create_app action produced",
    pass: result.createAppConfig !== null,
    detail: result.createAppConfig
      ? `template: ${result.createAppConfig.template}`
      : "No create_app found",
  });

  return checks;
}

function verifyAppCreation(appResult) {
  const checks = [];

  checks.push({
    name: "App created (HTTP 201)",
    pass: appResult.status === 201,
    detail: `Status: ${appResult.status}`,
  });

  if (appResult.status === 201) {
    const app = appResult.body;

    checks.push({
      name: "App has ID",
      pass: !!app.id,
      detail: app.id || "missing",
    });

    checks.push({
      name: "App has slug",
      pass: !!app.slug,
      detail: app.slug || "missing",
    });

    checks.push({
      name: "App has port assigned",
      pass: typeof app.port === "number" && app.port > 3000,
      detail: `port: ${app.port}`,
    });

    // Check filesystem
    const appDir = path.join(process.cwd(), "apps", app.slug);
    const dirExists = fs.existsSync(appDir);
    checks.push({
      name: "App directory created on filesystem",
      pass: dirExists,
      detail: dirExists ? appDir : "Directory not found",
    });

    if (dirExists) {
      const composePath = path.join(appDir, "docker-compose.yml");
      const composeExists = fs.existsSync(composePath);
      checks.push({
        name: "docker-compose.yml exists",
        pass: composeExists,
        detail: composeExists ? "OK" : "File not found",
      });
    }
  }

  return checks;
}

// ─── Report ─────────────────────────────────────────────────────────────────

function printChecks(checks) {
  for (const c of checks) {
    const icon = c.pass ? `${colors.green}✓` : `${colors.red}✗`;
    const detail = c.pass
      ? `${colors.dim}(${c.detail})${colors.reset}`
      : `${colors.red}(${c.detail})${colors.reset}`;
    console.log(`    ${icon}${colors.reset} ${c.name} ${detail}`);
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  logSection("Multi-Agent App Creation E2E Test");

  console.log(`  Base URL:     ${BASE_URL}`);
  console.log(`  Test cases:   ${selectedCases.join(", ")}`);
  console.log(`  Timeout:      ${totalTimeoutMs / 1000}s per case`);
  console.log(`  Verbose:      ${verbose}`);

  // ── Step 1: Login ──
  logSubsection("Step 1: Authentication");

  let cookie;
  try {
    cookie = await login("admin@example.com", "password123");
    log(colors.green, "  ✓", "Logged in as admin@example.com");
  } catch (err) {
    log(colors.red, "  ✗", `Login failed: ${err.message}`);
    log(colors.yellow, "  ℹ", "Make sure dev server is running (pnpm dev) and DB is seeded");
    process.exit(1);
  }

  let userId;
  try {
    userId = await getUserId(cookie);
    log(colors.green, "  ✓", `User ID: ${userId}`);
  } catch (err) {
    log(colors.red, "  ✗", `Failed to get user ID: ${err.message}`);
    process.exit(1);
  }

  // ── Step 2: Run test cases ──
  const allResults = [];
  const createdAppIds = [];

  for (const caseKey of selectedCases) {
    const tc = TEST_CASES[caseKey];
    logSubsection(`Step 2: Multi-Agent Chat — ${tc.name}`);
    log(colors.dim, "  📋", tc.description);
    log(colors.cyan, "  💬", `Prompt: "${tc.prompt}"`);
    console.log("");

    // 2a. Run multi-agent chat
    const chatResult = await runMultiAgentChat(cookie, tc.prompt, totalTimeoutMs);

    console.log("");
    log(colors.dim, "  ⏱", `Duration: ${(chatResult.duration / 1000).toFixed(1)}s`);
    log(colors.dim, "  📊", `Events: ${chatResult.totalEvents} | Tokens: ${chatResult.tokenUsage.total}`);
    log(colors.dim, "  🔄", `Agent sequence: [${chatResult.agentSequence.join(" → ")}]`);

    // 2b. Verify agent flow
    logSubsection(`Verification — Agent Flow (${tc.name})`);
    const agentChecks = verifyAgentFlow(chatResult, tc.expectedAgents);
    printChecks(agentChecks);

    // 2c. Create app if create_app config was produced
    let appChecks = [];
    if (chatResult.createAppConfig) {
      logSubsection(`Step 3: App Creation via API (${tc.name})`);

      const config = chatResult.createAppConfig;
      log(colors.cyan, "  🏗", `Creating app: ${config.name || config.appName} (template: ${config.template})`);

      const appResult = await createAppFromConfig(cookie, userId, config);
      appChecks = verifyAppCreation(appResult);
      printChecks(appChecks);

      if (appResult.status === 201) {
        createdAppIds.push(appResult.body.id);
        log(colors.green, "  🎉", `App created: ${appResult.body.slug} (id: ${appResult.body.id})`);
      }
    } else {
      log(colors.yellow, "  ⚠", "Skipping app creation — no create_app config produced");
    }

    allResults.push({
      case: caseKey,
      name: tc.name,
      chatResult,
      agentChecks,
      appChecks,
    });
  }

  // ── Step 4: Verify cross-app isolation ──
  if (createdAppIds.length > 1) {
    logSubsection("Step 4: Cross-App Isolation Verification");

    const appsRes = await fetch(API_APPS, {
      headers: { Cookie: cookie },
    });
    const apps = await appsRes.json();

    const createdApps = apps.filter((a) => createdAppIds.includes(a.id));
    const slugs = createdApps.map((a) => a.slug);
    const ports = createdApps.map((a) => a.port);

    // Unique slugs
    const uniqueSlugs = new Set(slugs);
    const slugCheck = {
      name: "All apps have unique slugs",
      pass: uniqueSlugs.size === createdApps.length,
      detail: `${uniqueSlugs.size}/${createdApps.length} unique`,
    };

    // Unique ports
    const uniquePorts = new Set(ports);
    const portCheck = {
      name: "All apps have unique ports",
      pass: uniquePorts.size === createdApps.length,
      detail: `ports: [${ports.join(", ")}]`,
    };

    printChecks([slugCheck, portCheck]);
  }

  // ── Step 5: Cleanup ──
  logSubsection("Step 5: Cleanup");
  for (const appId of createdAppIds) {
    await deleteApp(cookie, appId);
    log(colors.dim, "  🗑", `Deleted app: ${appId}`);
  }
  log(colors.green, "  ✓", `Cleaned up ${createdAppIds.length} apps`);

  // ── Final Summary ──
  logSection("Test Summary");

  let totalPass = 0;
  let totalFail = 0;

  for (const r of allResults) {
    const allChecks = [...r.agentChecks, ...r.appChecks];
    const passed = allChecks.filter((c) => c.pass).length;
    const failed = allChecks.filter((c) => !c.pass).length;
    totalPass += passed;
    totalFail += failed;

    const icon = failed === 0 ? `${colors.green}✓` : `${colors.red}✗`;
    const duration = (r.chatResult.duration / 1000).toFixed(1);
    console.log(
      `  ${icon}${colors.reset} ${r.name} — ${passed}/${allChecks.length} checks passed (${duration}s)`
    );

    if (failed > 0) {
      for (const c of allChecks.filter((c) => !c.pass)) {
        console.log(`    ${colors.red}  ✗ ${c.name}: ${c.detail}${colors.reset}`);
      }
    }
  }

  console.log("");
  console.log(
    `  ${colors.bold}Total: ${totalPass} passed, ${totalFail} failed${colors.reset}`
  );

  if (totalFail > 0) {
    console.log(`\n${colors.red}${colors.bold}  ✗ SOME TESTS FAILED${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}${colors.bold}  ✓ ALL TESTS PASSED${colors.reset}\n`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
