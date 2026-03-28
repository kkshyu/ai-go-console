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
import { FolderUp, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  readEntryFiles,
  readInputFiles,
  shouldIncludeFile,
  readFileAsText,
} from "@/lib/folder-reader";

type ImportStep = "upload" | "analyzing" | "review" | "creating" | "error";

interface AnalysisResult {
  name: string;
  slug: string;
  description: string;
  template: string;
  requiredServices: string[];
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
  const [files, setFiles] = useState<Array<{ path: string; content: string }>>(
    []
  );
  const [errorMsg, setErrorMsg] = useState("");
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Set webkitdirectory imperatively
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      // Small delay to let closing animation finish
      const timer = setTimeout(() => {
        setStep("upload");
        setAnalysis(null);
        setFiles([]);
        setErrorMsg("");
        setIsDragging(false);
        dragCounter.current = 0;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  const processFiles = useCallback(
    async (rawFiles: Array<{ file: File; relativePath: string }>) => {
      // Filter out binary/unwanted files
      const filtered = rawFiles.filter((f) => shouldIncludeFile(f.relativePath));

      if (filtered.length === 0) {
        setErrorMsg(t("importNoFiles"));
        setStep("error");
        return;
      }

      // Read file contents
      const fileContents: Array<{ path: string; content: string }> = [];
      for (const { file, relativePath } of filtered) {
        const text = await readFileAsText(file);
        if (text !== null) {
          fileContents.push({ path: relativePath, content: text });
        }
      }

      if (fileContents.length === 0) {
        setErrorMsg(t("importNoFiles"));
        setStep("error");
        return;
      }

      setFiles(fileContents);
      setStep("analyzing");

      // Call analysis API
      try {
        const res = await fetch("/api/apps/import/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: fileContents }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const result: AnalysisResult = await res.json();
        setAnalysis(result);
        setStep("review");
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : t("importError")
        );
        setStep("error");
      }
    },
    [t]
  );

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

      await processFiles(allFiles);
    },
    [processFiles]
  );

  const handleFolderSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;

      const rawFiles = readInputFiles(fileList);
      await processFiles(rawFiles);

      // Reset input so the same folder can be selected again
      if (folderInputRef.current) folderInputRef.current.value = "";
    },
    [processFiles]
  );

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
          files: files,
          serviceIds: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onAppCreated();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to create app"
      );
      setStep("error");
    }
  }, [analysis, files, onAppCreated]);

  const handleRetry = useCallback(() => {
    setStep("upload");
    setAnalysis(null);
    setFiles([]);
    setErrorMsg("");
  }, []);

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
                ref={folderInputRef}
                type="file"
                className="hidden"
                onChange={handleFolderSelect}
                multiple
              />
              <Button
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderUp className="h-4 w-4" />
                {t("importSelectFolder")}
              </Button>
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
                  {t("importFileCount", { count: files.length })}
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
