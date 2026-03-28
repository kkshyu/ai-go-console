"use client";

import { useState, useRef, useCallback, useEffect, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  FolderUp,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Play,
} from "lucide-react";
import {
  readEntryFiles,
  readInputFiles,
  shouldIncludeForImport,
} from "@/lib/folder-reader";

type ImportStep =
  | "upload"
  | "uploading"
  | "processing"
  | "analyzing"
  | "review"
  | "creating"
  | "starting"
  | "error";

interface AnalysisResult {
  name: string;
  slug: string;
  description: string;
  template: string;
  requiredServices: string[];
}

interface ImportProgress {
  total: number;
  ready: number;
  error: number;
  processing: number;
  uploaded: number;
}

interface AutostartEvent {
  step: string;
  attempt?: number;
  message: string;
  errors?: string[];
  filesFixed?: string[];
}

interface ImportAppDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAppCreated: () => void;
}

export function ImportAppDialog({
  open,
  onOpenChange,
  onAppCreated,
}: ImportAppDialogProps) {
  const t = useTranslations("apps");
  const tc = useTranslations("common");
  const [step, setStep] = useState<ImportStep>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [_importSessionId, setImportSessionId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [autostartEvents, setAutostartEvents] = useState<AutostartEvent[]>([]);
  const [fileCount, setFileCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [_createdAppId, setCreatedAppId] = useState<string | null>(null);
  const folderInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.setAttribute("webkitdirectory", "");
      node.setAttribute("directory", "");
    }
  }, []);
  const folderInputClickRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      const timer = setTimeout(() => {
        setStep("upload");
        setAnalysis(null);
        setImportSessionId(null);
        setProgress(null);
        setAutostartEvents([]);
        setFileCount(0);
        setErrorMsg("");
        setCreatedAppId(null);
        setIsDragging(false);
        dragCounter.current = 0;
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Upload files to server
  const uploadFiles = useCallback(
    async (rawFiles: Array<{ file: File; relativePath: string }>) => {
      const filtered = rawFiles.filter((f) =>
        shouldIncludeForImport(f.relativePath)
      );

      if (filtered.length === 0) {
        setErrorMsg(t("importNoFiles"));
        setStep("error");
        return;
      }

      setStep("uploading");
      setFileCount(filtered.length);

      try {
        const formData = new FormData();
        for (const { file, relativePath } of filtered) {
          formData.append("files", file);
          formData.append("paths", relativePath);
        }

        const res = await fetch("/api/apps/import/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result = await res.json();
        setImportSessionId(result.importSessionId);
        setFileCount(result.fileCount);
        setStep("processing");

        // Start polling for processing progress
        startPolling(result.importSessionId);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : t("importError"));
        setStep("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startPolling is stable ref-based
    [t]
  );

  // Poll processing status
  const startPolling = useCallback(
    (sessionId: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/apps/import/status?sessionId=${sessionId}`
          );
          if (!res.ok) return;

          const status: ImportProgress = await res.json();
          setProgress(status);

          // Check if all files are processed
          const done = status.ready + status.error;
          if (done >= status.total && status.total > 0) {
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
            // Trigger analysis
            triggerAnalysis(sessionId);
          }
        } catch {
          // Ignore polling errors
        }
      }, 2000);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Trigger RAG-based analysis
  const triggerAnalysis = useCallback(
    async (sessionId: string) => {
      setStep("analyzing");

      try {
        const res = await fetch("/api/apps/import/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ importSessionId: sessionId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result: AnalysisResult = await res.json();
        setAnalysis(result);
        setStep("review");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : t("importError"));
        setStep("error");
      }
    },
    [t]
  );

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      const items = e.dataTransfer.items;
      if (!items || items.length === 0) return;

      const allFiles: Array<{ file: File; relativePath: string }> = [];
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) {
          const entryFiles = await readEntryFiles(entry, "");
          allFiles.push(...entryFiles);
        }
      }

      await uploadFiles(allFiles);
    },
    [uploadFiles]
  );

  const handleFolderSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const rawFiles = readInputFiles(fileList);
      await uploadFiles(rawFiles);

      if (folderInputClickRef.current) folderInputClickRef.current.value = "";
    },
    [uploadFiles]
  );

  // Confirm and create app, then auto-start
  const handleConfirm = useCallback(async () => {
    if (!analysis) return;
    setStep("creating");

    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: analysis.name,
          slug: analysis.slug,
          description: analysis.description,
          template: analysis.template,
          serviceIds: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const app = await res.json();
      setCreatedAppId(app.id);

      // Auto-start the app
      setStep("starting");
      setAutostartEvents([]);
      startAutostart(app.id);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create app"
      );
      setStep("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- startAutostart is stable ref-based
  }, [analysis]);

  // Connect to autostart SSE
  const startAutostart = useCallback(async (appId: string) => {
    try {
      const res = await fetch("/api/apps/import/autostart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId }),
      });

      if (!res.ok || !res.body) {
        setErrorMsg("Failed to start autostart");
        setStep("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice(6)) as AutostartEvent;
            setAutostartEvents((prev) => [...prev, event]);

            if (event.step === "success") {
              // Wait a moment then notify parent
              setTimeout(() => onAppCreated(), 1500);
            } else if (event.step === "failed") {
              // Keep showing the starting UI with error state
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Autostart connection failed"
      );
      setStep("error");
    }
  }, [onAppCreated]);

  const handleRetry = useCallback(() => {
    setStep("upload");
    setAnalysis(null);
    setImportSessionId(null);
    setProgress(null);
    setAutostartEvents([]);
    setFileCount(0);
    setErrorMsg("");
    setCreatedAppId(null);
  }, []);

  const progressPercent =
    progress && progress.total > 0
      ? Math.round(((progress.ready + progress.error) / progress.total) * 100)
      : 0;

  const lastAutostartEvent =
    autostartEvents.length > 0
      ? autostartEvents[autostartEvents.length - 1]
      : null;

  const autostartSuccess = lastAutostartEvent?.step === "success";
  const autostartFailed = lastAutostartEvent?.step === "failed";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t("importTitle")}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {t("importDescription")}
          </p>
        </SheetHeader>

        <div className="px-6 pb-6">
          {/* Upload step */}
          {step === "upload" && (
            <div
              className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <FolderUp className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                {t("importDropZone")}
              </p>
              <input
                ref={(node) => {
                  folderInputClickRef.current = node;
                  folderInputRef(node);
                }}
                type="file"
                className="hidden"
                onChange={handleFolderSelect}
              />
              <Button
                variant="outline"
                onClick={() => folderInputClickRef.current?.click()}
              >
                <FolderUp className="h-4 w-4" />
                {t("importSelectFolder")}
              </Button>
            </div>
          )}

          {/* Uploading step */}
          {step === "uploading" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("importUploading", { count: fileCount })}
              </p>
            </div>
          )}

          {/* Processing step */}
          {step === "processing" && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("importProcessing")}
              </p>
              {progress && (
                <div className="w-full space-y-2">
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    {progress.ready + progress.error} / {progress.total}{" "}
                    {t("importFilesProcessed")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Analyzing step */}
          {step === "analyzing" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("importAnalyzing")}
              </p>
            </div>
          )}

          {/* Review step */}
          {step === "review" && analysis && (
            <div className="mt-4 space-y-4">
              <h3 className="font-medium">{t("importReviewTitle")}</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("importAppName")}
                  </label>
                  <Input
                    value={analysis.name}
                    onChange={(e) =>
                      setAnalysis({ ...analysis, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("importSlug")}
                  </label>
                  <Input
                    value={analysis.slug}
                    onChange={(e) =>
                      setAnalysis({ ...analysis, slug: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("importAppDescription")}
                  </label>
                  <Input
                    value={analysis.description}
                    onChange={(e) =>
                      setAnalysis({
                        ...analysis,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t("importTemplate")}
                  </label>
                  <div className="mt-1">
                    <Badge variant="outline">{analysis.template}</Badge>
                  </div>
                </div>

                {analysis.requiredServices.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      {t("importServices")}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {analysis.requiredServices.map((svc) => (
                        <Badge key={svc} variant="secondary">
                          {svc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("importFileCount", { count: fileCount })}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {tc("cancel")}
                </Button>
                <Button className="flex-1" onClick={handleConfirm}>
                  <CheckCircle2 className="h-4 w-4" />
                  {t("importConfirm")}
                </Button>
              </div>
            </div>
          )}

          {/* Creating step */}
          {step === "creating" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t("importCreating")}
              </p>
            </div>
          )}

          {/* Starting / Auto-fix step */}
          {step === "starting" && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                {autostartSuccess ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : autostartFailed ? (
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                ) : (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                )}
                <h3 className="font-medium">
                  {autostartSuccess
                    ? t("importStartSuccess")
                    : autostartFailed
                      ? t("importStartFailed")
                      : t("importStarting")}
                </h3>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {autostartEvents.map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 text-xs ${
                      event.step === "success"
                        ? "text-green-600"
                        : event.step === "failed" || event.step === "error"
                          ? "text-destructive"
                          : event.step === "fixing"
                            ? "text-amber-600"
                            : "text-muted-foreground"
                    }`}
                  >
                    {event.step === "fixing" && (
                      <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
                    )}
                    {event.step === "success" && (
                      <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                    )}
                    {(event.step === "starting" ||
                      event.step === "restarting") && (
                      <Play className="h-3 w-3 mt-0.5 shrink-0" />
                    )}
                    <span>{event.message}</span>
                  </div>
                ))}
              </div>

              {(autostartSuccess || autostartFailed) && (
                <div className="flex gap-2 pt-2">
                  {autostartFailed && (
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleRetry}
                    >
                      {t("importRetry")}
                    </Button>
                  )}
                  <Button
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    {tc("close")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Error step */}
          {step === "error" && (
            <div className="mt-8 flex flex-col items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive text-center">
                {errorMsg || t("importError")}
              </p>
              <Button variant="outline" onClick={handleRetry}>
                {t("importRetry")}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
