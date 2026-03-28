"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, RotateCw, Circle } from "lucide-react";

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  less: "less",
  md: "markdown",
  mdx: "markdown",
  py: "python",
  sql: "sql",
  yaml: "yaml",
  yml: "yaml",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  dockerfile: "dockerfile",
  xml: "xml",
  svg: "xml",
  graphql: "graphql",
  gql: "graphql",
  env: "ini",
  ini: "ini",
  toml: "ini",
  prisma: "graphql",
};

function detectLanguage(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower === "dockerfile" || lower.startsWith("dockerfile.")) return "dockerfile";
  const ext = lower.split(".").pop() || "";
  return LANG_MAP[ext] || "plaintext";
}

interface FileEditorProps {
  appId: string;
  filePath: string;
  onBack: () => void;
  containerType?: "dev" | "prod";
}

export function FileEditor({ appId, filePath, onBack, containerType = "dev" }: FileEditorProps) {
  const t = useTranslations("fileManager");
  const tc = useTranslations("common");
  const [content, setContent] = useState<string | null>(null);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const fileName = filePath.split("/").pop() || filePath;
  const language = detectLanguage(fileName);
  const isDirty = content !== null && savedContent !== null && content !== savedContent;

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ path: filePath });
    if (containerType !== "dev") qs.set("containerType", containerType);
    fetch(`/api/apps/${appId}/files/content?${qs.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setContent(data.content);
          setSavedContent(data.content);
        }
      })
      .catch(() => setError(t("failedToLoadFile")))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from next-intl
  }, [appId, filePath, containerType]);

  const handleSave = useCallback(async () => {
    if (content === null || saving) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const saveQs = new URLSearchParams({ path: filePath });
      if (containerType !== "dev") saveQs.set("containerType", containerType);
      const res = await fetch(
        `/api/apps/${appId}/files/content?${saveQs.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        setSavedContent(content);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }, [appId, filePath, content, saving, containerType]);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    // Cmd+S / Ctrl+S to save
    editor.addCommand(
      // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyS
      2048 | 49, // CtrlCmd = 2048, KeyS = 49
      () => {
        handleSave();
      }
    );
  };

  const handleBack = () => {
    if (isDirty) {
      const ok = window.confirm(t("unsavedChanges"));
      if (!ok) return;
    }
    onBack();
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        <RotateCw className="h-4 w-4 animate-spin mr-2" />
        {tc("loading")}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        <p>{error}</p>
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-3 w-3 mr-1" />
          {tc("back")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Editor toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/40">
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <span className="text-xs font-mono text-muted-foreground truncate flex-1">{filePath}</span>
        {isDirty && (
          <Circle className="h-2 w-2 fill-orange-400 text-orange-400 shrink-0" />
        )}
        {saveStatus === "saved" && (
          <span className="text-xs text-green-600">{t("saved")}</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-red-600">{t("saveFailed")}</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={handleSave}
          disabled={saving || !isDirty}
        >
          {saving ? (
            <RotateCw className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <Save className="h-3 w-3 mr-1" />
          )}
          {saving ? t("saving") : t("save")}
        </Button>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language}
          value={content ?? ""}
          theme="vs-dark"
          onChange={(value) => setContent(value ?? "")}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            automaticLayout: true,
            padding: { top: 8, bottom: 8 },
          }}
        />
      </div>
    </div>
  );
}
