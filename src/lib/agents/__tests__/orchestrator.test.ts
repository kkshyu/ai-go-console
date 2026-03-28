import { describe, test, expect } from "vitest";
import {
  parsePMActions,
  parsePMAction,
  parseAgentResult,
  stateForDispatch,
  stateForAgentComplete,
  stateForComplete,
  stateForParallelDispatch,
  stateForParallelTaskComplete,
  buildAgentContext,
  createInitialOrchestrationState,
} from "../orchestrator";

describe("parsePMActions", () => {
  test("parses single dispatch action", () => {
    const content = `I'll dispatch the architect.
\`\`\`json
{"action": "dispatch", "target": "architect", "task": "Design the API"}
\`\`\``;
    const actions = parsePMActions(content);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      action: "dispatch",
      target: "architect",
      task: "Design the API",
    });
  });

  test("parses multiple actions (update_prd + dispatch)", () => {
    const content = `First update the PRD, then dispatch.
\`\`\`json
{"action": "update_prd", "prd": {"appName": "MyApp", "description": "A test app", "targetUsers": "devs", "features": ["auth"], "dataNeeds": [], "integrations": [], "requiredServices": []}}
\`\`\`

\`\`\`json
{"action": "dispatch", "target": "developer", "task": "Implement auth"}
\`\`\``;
    const actions = parsePMActions(content);
    expect(actions).toHaveLength(2);
    expect(actions[0].action).toBe("update_prd");
    expect(actions[1].action).toBe("dispatch");
  });

  test("handles malformed JSON blocks gracefully", () => {
    const content = `\`\`\`json
{invalid json here}
\`\`\`

\`\`\`json
{"action": "complete", "summary": "Done"}
\`\`\``;
    const actions = parsePMActions(content);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("complete");
  });

  test("returns empty array for no JSON blocks", () => {
    const actions = parsePMActions("Just plain text, no code blocks.");
    expect(actions).toEqual([]);
  });

  test("parses dispatch_parallel with tasks array", () => {
    const content = `\`\`\`json
{"action": "dispatch_parallel", "target": "developer", "tasks": [
  {"taskId": "t1", "task": "Build UI", "files": ["ui.tsx"]},
  {"taskId": "t2", "task": "Build API", "files": ["api.ts"]}
]}
\`\`\``;
    const actions = parsePMActions(content);
    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("dispatch_parallel");
    if (actions[0].action === "dispatch_parallel") {
      expect(actions[0].tasks).toHaveLength(2);
      expect(actions[0].tasks[0].taskId).toBe("t1");
    }
  });

  test("parses respond action", () => {
    const content = `\`\`\`json
{"action": "respond", "message": "Can you clarify?"}
\`\`\``;
    const actions = parsePMActions(content);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({
      action: "respond",
      message: "Can you clarify?",
    });
  });
});

describe("parsePMAction", () => {
  test("returns first non-update_prd action", () => {
    const content = `\`\`\`json
{"action": "update_prd", "prd": {"appName": "X", "description": "", "targetUsers": "", "features": [], "dataNeeds": [], "integrations": [], "requiredServices": []}}
\`\`\`

\`\`\`json
{"action": "dispatch", "target": "architect", "task": "Design"}
\`\`\``;
    const action = parsePMAction(content);
    expect(action).not.toBeNull();
    expect(action!.action).toBe("dispatch");
  });

  test("returns null for empty content", () => {
    const action = parsePMAction("No JSON here.");
    expect(action).toBeNull();
  });

  test("returns update_prd if it is the only action", () => {
    const content = `\`\`\`json
{"action": "update_prd", "prd": {"appName": "X", "description": "", "targetUsers": "", "features": [], "dataNeeds": [], "integrations": [], "requiredServices": []}}
\`\`\``;
    const action = parsePMAction(content);
    expect(action).not.toBeNull();
    expect(action!.action).toBe("update_prd");
  });
});

describe("parseAgentResult", () => {
  test("detects blocked status", () => {
    const content = `\`\`\`json
{"status": "blocked", "blockedReason": "Missing API key"}
\`\`\``;
    const result = parseAgentResult(content);
    expect(result.blocked).toBe(true);
    expect(result.blockedReason).toBe("Missing API key");
    expect(result.summary).toBe("Missing API key");
  });

  test("extracts summary from architect design", () => {
    const content = `\`\`\`json
{"design": {"architecture": "Microservices with event-driven communication"}}
\`\`\``;
    const result = parseAgentResult(content);
    expect(result.blocked).toBe(false);
    expect(result.summary).toBe("Microservices with event-driven communication");
  });

  test("handles missing JSON gracefully", () => {
    const content = "Just some plain text output from the agent without any JSON.";
    const result = parseAgentResult(content);
    expect(result.blocked).toBe(false);
    expect(result.summary).toBe(content.slice(0, 200));
  });

  test("extracts summary from file modifications", () => {
    const content = `\`\`\`json
{"action": "modify_files", "files": [{"path": "a.ts"}, {"path": "b.ts"}], "summary": "Updated both files"}
\`\`\``;
    const result = parseAgentResult(content);
    expect(result.blocked).toBe(false);
    expect(result.summary).toContain("2 file(s)");
    expect(result.summary).toContain("Updated both files");
  });

  test("extracts review summary", () => {
    const content = `\`\`\`json
{"review": {"summary": "Code looks good, minor style issues"}}
\`\`\``;
    const result = parseAgentResult(content);
    expect(result.summary).toBe("Code looks good, minor style issues");
  });

  test("handles malformed JSON in code block", () => {
    const content = `\`\`\`json
{not valid json at all
\`\`\``;
    const result = parseAgentResult(content);
    expect(result.blocked).toBe(false);
    // Falls back to slicing content
    expect(typeof result.summary).toBe("string");
  });
});

describe("state transitions", () => {
  test("stateForDispatch sets running status", () => {
    const initial = createInitialOrchestrationState();
    const next = stateForDispatch(initial, "architect", "Design the system");
    expect(next.status).toBe("running");
    expect(next.currentAgent).toBe("architect");
    expect(next.tasks).toHaveLength(1);
    expect(next.tasks[0]).toEqual({
      agentRole: "architect",
      status: "running",
      description: "Design the system",
    });
  });

  test("stateForAgentComplete returns to PM", () => {
    const running = stateForDispatch(
      createInitialOrchestrationState(),
      "developer",
      "Write code"
    );
    const next = stateForAgentComplete(running, "developer", "Code written");
    expect(next.currentAgent).toBe("pm");
    expect(next.tasks[0].status).toBe("completed");
    expect(next.tasks[0].summary).toBe("Code written");
  });

  test("stateForComplete marks all completed", () => {
    let state = createInitialOrchestrationState();
    state = stateForDispatch(state, "architect", "Design");
    const next = stateForComplete(state, "All done");
    expect(next.status).toBe("completed");
    expect(next.currentAgent).toBeNull();
    expect(next.tasks[0].status).toBe("completed");
    expect(next.tasks[0].summary).toBe("All done");
  });

  test("stateForDispatch preserves existing tasks", () => {
    let state = createInitialOrchestrationState();
    state = stateForDispatch(state, "architect", "Design");
    state = stateForAgentComplete(state, "architect", "Designed");
    state = stateForDispatch(state, "developer", "Code");
    expect(state.tasks).toHaveLength(2);
    expect(state.tasks[0].agentRole).toBe("architect");
    expect(state.tasks[1].agentRole).toBe("developer");
  });

  test("parallel state tracks group and tasks", () => {
    const initial = createInitialOrchestrationState();
    const next = stateForParallelDispatch(initial, "group-1", [
      { taskId: "t1", description: "Build UI" },
      { taskId: "t2", description: "Build API" },
    ]);
    expect(next.status).toBe("running");
    expect(next.parallelGroups).toHaveLength(1);
    expect(next.parallelGroups[0].groupId).toBe("group-1");
    expect(next.parallelGroups[0].tasks).toHaveLength(2);
    expect(next.parallelGroups[0].status).toBe("running");
  });

  test("stateForParallelTaskComplete updates individual task", () => {
    let state = createInitialOrchestrationState();
    state = stateForParallelDispatch(state, "group-1", [
      { taskId: "t1", description: "Build UI" },
      { taskId: "t2", description: "Build API" },
    ]);
    // Complete t1 — actor IDs are "developer-0", "developer-1"
    // The matching uses actorId or description containing the taskId
    state = stateForParallelTaskComplete(state, "group-1", "developer-0", "UI done");
    const group = state.parallelGroups[0];
    // At least one task should be completed
    const completedTasks = group.tasks.filter((t) => t.status === "completed");
    expect(completedTasks.length).toBeGreaterThanOrEqual(1);
    // Group should still be running if not all tasks are done
    expect(group.status).toBe("running");
  });
});

describe("buildAgentContext", () => {
  test("extracts JSON from assistant messages", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: `Here is my design:
\`\`\`json
{"design": {"architecture": "monolith"}}
\`\`\``,
        agentRole: "architect" as const,
      },
    ];
    const context = buildAgentContext(messages);
    expect(context).toContain("ARCHITECT");
    expect(context).toContain('"architecture": "monolith"');
  });

  test("ignores user messages", () => {
    const messages = [
      {
        role: "user" as const,
        content: `\`\`\`json
{"action": "dispatch"}
\`\`\``,
      },
    ];
    const context = buildAgentContext(messages);
    expect(context).toBe("");
  });

  test("returns empty for no JSON content", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: "Just plain text, no JSON.",
        agentRole: "developer" as const,
      },
    ];
    const context = buildAgentContext(messages);
    expect(context).toBe("");
  });

  test("combines multiple agent outputs", () => {
    const messages = [
      {
        role: "assistant" as const,
        content: `\`\`\`json
{"design": "v1"}
\`\`\``,
        agentRole: "architect" as const,
      },
      {
        role: "assistant" as const,
        content: `\`\`\`json
{"files": ["a.ts"]}
\`\`\``,
        agentRole: "developer" as const,
      },
    ];
    const context = buildAgentContext(messages);
    expect(context).toContain("ARCHITECT");
    expect(context).toContain("DEVELOPER");
  });
});
