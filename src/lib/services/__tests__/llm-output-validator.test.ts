import { describe, test, expect } from "vitest";
import {
  extractJson,
  validatePMAction,
  validateAgentFileOutput,
} from "../llm-output-validator";

describe("extractJson", () => {
  test("extracts JSON from code block", () => {
    const input = `Here is the result:
\`\`\`json
{"action": "dispatch", "target": "architect"}
\`\`\`
That's my plan.`;
    const result = extractJson(input);
    expect(result).toEqual({ action: "dispatch", target: "architect" });
  });

  test("extracts raw JSON object", () => {
    const input = '{"name": "test", "value": 42}';
    const result = extractJson(input);
    expect(result).toEqual({ name: "test", value: 42 });
  });

  test("extracts JSON from surrounding text", () => {
    const input = 'The output is {"action": "complete", "summary": "done"} as requested.';
    const result = extractJson(input);
    expect(result).toEqual({ action: "complete", summary: "done" });
  });

  test("returns null for invalid JSON", () => {
    const input = "This has no JSON at all, just plain text.";
    const result = extractJson(input);
    expect(result).toBeNull();
  });

  test("handles malformed JSON with trailing commas", () => {
    const input = `\`\`\`json
{"action": "dispatch", "target": "developer",}
\`\`\``;
    const result = extractJson(input);
    expect(result).toEqual({ action: "dispatch", target: "developer" });
  });

  test("returns null for empty string", () => {
    const result = extractJson("");
    expect(result).toBeNull();
  });

  test("extracts JSON from code block without json label", () => {
    const input = `\`\`\`
{"action": "respond", "message": "hello"}
\`\`\``;
    const result = extractJson(input);
    expect(result).toEqual({ action: "respond", message: "hello" });
  });

  test("extracts raw JSON with extra text after object", () => {
    const input = '{"key": "value"} some trailing text that is not JSON';
    const result = extractJson(input);
    expect(result).toEqual({ key: "value" });
  });
});

describe("validatePMAction", () => {
  test("validates dispatch action", () => {
    const input = `\`\`\`json
{"action": "dispatch", "target": "architect", "task": "Design the system"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toEqual({
      action: {
        action: "dispatch",
        target: "architect",
        task: "Design the system",
      },
    });
  });

  test("validates respond action", () => {
    const input = `\`\`\`json
{"action": "respond", "message": "I need more info"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toEqual({
      action: {
        action: "respond",
        message: "I need more info",
      },
    });
  });

  test("validates complete action", () => {
    const input = `\`\`\`json
{"action": "complete", "summary": "All tasks done"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toEqual({
      action: {
        action: "complete",
        summary: "All tasks done",
      },
    });
  });

  test("validates dispatch_parallel action", () => {
    const input = `\`\`\`json
{"action": "dispatch_parallel", "target": "developer", "tasks": [
  {"taskId": "t1", "task": "Build UI", "files": ["src/app.tsx"]},
  {"taskId": "t2", "task": "Build API", "files": ["src/api.ts"]}
]}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toEqual({
      action: {
        action: "dispatch_parallel",
        target: "developer",
        tasks: [
          { taskId: "t1", task: "Build UI", files: ["src/app.tsx"] },
          { taskId: "t2", task: "Build API", files: ["src/api.ts"] },
        ],
      },
    });
  });

  test("accepts all extended agent targets in dispatch", () => {
    const extendedTargets = ["ux_designer", "tester", "db_migrator", "doc_writer"];
    for (const target of extendedTargets) {
      const input = `\`\`\`json
{"action": "dispatch", "target": "${target}", "task": "Do the work"}
\`\`\``;
      const result = validatePMAction(input);
      expect(result).toHaveProperty("action");
      expect((result as { action: { target: string } }).action.target).toBe(target);
    }
  });

  test("rejects invalid target in dispatch", () => {
    const input = `\`\`\`json
{"action": "dispatch", "target": "invalid_agent", "task": "Do something"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("invalid target");
  });

  test("skips update_prd blocks", () => {
    const input = `\`\`\`json
{"action": "update_prd", "prd": {"appName": "Test"}}
\`\`\`

\`\`\`json
{"action": "dispatch", "target": "developer", "task": "Write code"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toEqual({
      action: {
        action: "dispatch",
        target: "developer",
        task: "Write code",
      },
    });
  });

  test("returns error for no JSON found", () => {
    const result = validatePMAction("Just some plain text with no JSON.");
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("No valid JSON");
  });

  test("returns error for missing action field", () => {
    const input = `\`\`\`json
{"target": "architect", "task": "Design"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("action");
  });

  test("returns error for dispatch missing target", () => {
    const input = `\`\`\`json
{"action": "dispatch", "task": "Do it"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("target");
  });

  test("returns error for dispatch missing task", () => {
    const input = `\`\`\`json
{"action": "dispatch", "target": "developer"}
\`\`\``;
    const result = validatePMAction(input);
    expect(result).toHaveProperty("error");
    expect((result as { error: string }).error).toContain("task");
  });
});

describe("validateAgentFileOutput", () => {
  test("validates file output with valid files", () => {
    const input = `\`\`\`json
{
  "action": "modify_files",
  "files": [
    {"path": "src/index.ts", "content": "console.log('hi');"},
    {"path": "src/util.ts", "content": "export const x = 1;"}
  ]
}
\`\`\``;
    const result = validateAgentFileOutput(input);
    expect(result).not.toBeNull();
    expect(result!.action).toBe("modify_files");
    expect(result!.files).toHaveLength(2);
    expect(result!.files[0].path).toBe("src/index.ts");
  });

  test("returns null for missing files array", () => {
    const input = `\`\`\`json
{"action": "modify_files"}
\`\`\``;
    const result = validateAgentFileOutput(input);
    expect(result).toBeNull();
  });

  test("returns null for invalid action", () => {
    const input = `\`\`\`json
{"files": [{"path": "a.ts", "content": "x"}]}
\`\`\``;
    const result = validateAgentFileOutput(input);
    expect(result).toBeNull();
  });

  test("returns null for file with missing path", () => {
    const input = `\`\`\`json
{"action": "create_files", "files": [{"content": "hello"}]}
\`\`\``;
    const result = validateAgentFileOutput(input);
    expect(result).toBeNull();
  });

  test("returns null for empty content", () => {
    const result = validateAgentFileOutput("");
    expect(result).toBeNull();
  });

  test("validates output with optional requiredServices", () => {
    const input = `\`\`\`json
{
  "action": "modify_files",
  "files": [{"path": "a.ts", "content": "x"}],
  "requiredServices": [{"instanceId": "s1", "name": "postgres", "type": "database"}]
}
\`\`\``;
    const result = validateAgentFileOutput(input);
    expect(result).not.toBeNull();
    expect(result!.requiredServices).toHaveLength(1);
  });
});
