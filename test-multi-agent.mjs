/**
 * Multi-agent API test script
 *
 * Tests the multi-agent flow by sending "建立一個馬拉松報名網站" and
 * parsing the SSE stream. Reports timeout if no message within 3s.
 */

const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api/chat/multi-agent`;
const DISPLAY_TIMEOUT_MS = 3000; // 3s for display message timeout

/**
 * Login via NextAuth credentials provider and return session cookie string.
 */
async function login(email, password) {
  // 1. Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;

  // Collect cookies from CSRF response
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

  const signInRes = await fetch(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStr,
      },
      body: params.toString(),
      redirect: "manual",
    }
  );

  // Collect all cookies from sign-in response
  for (const header of signInRes.headers.getSetCookie?.() || []) {
    const [kv] = header.split(";");
    const [k, v] = kv.split("=");
    cookies[k.trim()] = v.trim();
  }

  const finalCookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  console.log("Login status:", signInRes.status);
  console.log("Cookies:", Object.keys(cookies).join(", "));

  return finalCookieStr;
}

async function testMultiAgent() {
  const testMessage = process.argv[2] || "建立課程行銷頁面來蒐集名單";
  console.log("=== Multi-Agent Test ===");
  console.log(`Message: ${testMessage}\n`);

  // Login first
  console.log("--- Logging in ---");
  const cookie = await login("admin@example.com", "password123");
  console.log("");

  const body = {
    messages: [
      { role: "user", content: testMessage },
    ],
  };

  const controller = new AbortController();
  const totalTimeout = setTimeout(() => controller.abort(), 180000); // 3 min total

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    console.log("API Status:", res.status);
    console.log("Content-Type:", res.headers.get("content-type"));

    if (!res.ok || !res.headers.get("content-type")?.includes("text/event-stream")) {
      const text = await res.text();
      console.error("Not SSE response. Body preview:", text.slice(0, 300));
      process.exit(1);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    let currentAgent = null;
    let lastEventTime = Date.now();
    let agentEvents = [];
    let allEvents = [];
    let displayMessages = [];
    let completed = false;
    let orchState = null;
    let timeoutWarnings = 0;

    // Monitor for display timeout
    const timeoutChecker = setInterval(() => {
      const elapsed = Date.now() - lastEventTime;
      if (elapsed > DISPLAY_TIMEOUT_MS && !completed) {
        timeoutWarnings++;
        console.log(
          `  ⚠️  No event for ${(elapsed / 1000).toFixed(1)}s (agent: ${currentAgent || "unknown"})`
        );
      }
    }, 1000);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

      for (const line of lines) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") {
          completed = true;
          continue;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed === "[DONE]") {
            completed = true;
            continue;
          }

          lastEventTime = Date.now();
          allEvents.push(parsed);

          // Agent metadata
          if (parsed.agentRole && parsed.orchestrationState) {
            currentAgent = parsed.agentRole;
            orchState = parsed.orchestrationState;
            console.log(`\n🤖 Agent: ${parsed.agentRole.toUpperCase()}`);
            console.log(
              `   State: ${orchState.status} | Current: ${orchState.currentAgent}`
            );
            if (orchState.tasks?.length > 0) {
              console.log(
                `   Tasks: ${orchState.tasks.map((t) => `${t.agentRole}(${t.status})`).join(", ")}`
              );
            }
          }

          // Status update (progress message from PM)
          if (parsed.statusUpdate) {
            console.log(
              `   📌 ${parsed.statusUpdate}`
            );
          }

          // Thinking
          if (parsed.thinking) {
            console.log(
              `   💭 ${parsed.agentRole || currentAgent} is thinking...`
            );
          }

          // Translating
          if (parsed.translating) {
            console.log(`   🔄 Translating output...`);
          }

          // Content (translated display text)
          if (parsed.content && !parsed.orchestrationState) {
            const preview =
              parsed.content.length > 200
                ? parsed.content.slice(0, 200) + "..."
                : parsed.content;
            console.log(
              `   📝 Content (${parsed.agentRole || currentAgent}): ${preview}`
            );
            displayMessages.push({
              agent: parsed.agentRole || currentAgent,
              content: parsed.content,
            });
          }

          // Agent complete
          if (parsed.agentComplete) {
            const rawPreview = parsed.rawContent
              ? parsed.rawContent.length > 300
                ? parsed.rawContent.slice(0, 300) + "..."
                : parsed.rawContent
              : "(no raw)";
            console.log(
              `   ✅ ${parsed.agentRole || currentAgent} COMPLETE`
            );
            console.log(`   Raw: ${rawPreview}`);
            agentEvents.push({
              agent: parsed.agentRole || currentAgent,
              rawContent: parsed.rawContent,
            });

            if (parsed.orchestrationState) {
              orchState = parsed.orchestrationState;
            }
          }

          // Usage
          if (parsed.usage) {
            console.log(
              `   📊 Tokens: ${parsed.usage.totalTokens || 0} (${parsed.model || "unknown"})`
            );
          }

          // Error
          if (parsed.error) {
            console.error(`   ❌ Error: ${parsed.error}`);
          }
        } catch {
          // Not JSON
        }
      }
    }

    clearInterval(timeoutChecker);
    clearTimeout(totalTimeout);

    // Summary
    console.log("\n\n=== TEST RESULTS ===");
    console.log(`Total SSE events: ${allEvents.length}`);
    console.log(`Agent completions: ${agentEvents.length}`);
    console.log(`Display messages: ${displayMessages.length}`);
    console.log(`Stream completed: ${completed}`);
    console.log(`Timeout warnings (>3s): ${timeoutWarnings}`);

    if (orchState) {
      console.log(`\nFinal orchestration state:`);
      console.log(`  Status: ${orchState.status}`);
      console.log(`  Current agent: ${orchState.currentAgent}`);
      console.log(`  Tasks:`);
      for (const t of orchState.tasks || []) {
        console.log(
          `    - ${t.agentRole}: ${t.status} ${t.description ? `(${t.description.slice(0, 80)})` : ""}`
        );
      }
    }

    // Check for issues
    const issues = [];

    if (!completed) issues.push("Stream did not complete with [DONE]");
    if (agentEvents.length === 0)
      issues.push("No agent completions received");
    if (displayMessages.length === 0)
      issues.push("No display messages received");

    // Check if any agent produced a create_app action
    let hasCreateApp = false;
    for (const evt of agentEvents) {
      if (evt.rawContent?.includes('"create_app"')) {
        hasCreateApp = true;
        console.log("\n✅ create_app action found!");
        const match = evt.rawContent.match(/```json\s*\n([\s\S]*?)\n```/);
        if (match) {
          try {
            const appConfig = JSON.parse(match[1]);
            console.log("App config:", JSON.stringify(appConfig, null, 2));
          } catch {}
        }
      }
    }

    if (!hasCreateApp) {
      issues.push("No create_app action produced - app was NOT created");
    }

    if (orchState?.status !== "completed") {
      issues.push(
        `Orchestration did not complete (status: ${orchState?.status})`
      );
    }

    if (issues.length > 0) {
      console.log("\n⚠️  ISSUES:");
      for (const issue of issues) {
        console.log(`  - ${issue}`);
      }
    } else {
      console.log("\n🎉 All checks passed!");
    }

    process.exit(issues.length > 0 ? 1 : 0);
  } catch (err) {
    clearTimeout(totalTimeout);
    if (err.name === "AbortError") {
      console.error("Test timed out after 3 minutes");
    } else {
      console.error("Fatal error:", err.message);
    }
    process.exit(1);
  }
}

testMultiAgent();
