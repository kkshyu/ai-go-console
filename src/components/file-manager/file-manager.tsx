"use client";

import { useState, useCallback, useEffect, useRef, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowUp, Upload, FolderUp, RotateCw } from "lucide-react";
import { FileList, type FileEntry } from "./file-list";
import { FileEditor } from "./file-editor";

interface FileManagerProps {
  appId: string;
  containerType?: "dev" | "prod";
}

interface UploadProgress {
  done: number;
  total: number;
}

// Recursively read all files from a DataTransferItem directory entry
async function readEntryFiles(
  entry: FileSystemEntry,
  basePath: string
): Promise<Array<{ file: File; relativePath: string }>> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fileEntry.file((file) => {
        resolve([{ file, relativePath: basePath + file.name }]);
      });
    });
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries = await new Promise<FileSystemEntry[]>((resolve) => {
      const allEntries: FileSystemEntry[] = [];
      const readBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) {
            resolve(allEntries);
          } else {
            allEntries.push(...batch);
            readBatch();
          }
        });
      };
      readBatch();
    });
    const results: Array<{ file: File; relativePath: string }> = [];
    for (const child of entries) {
      const childFiles = await readEntryFiles(child, basePath + entry.name + "/");
      results.push(...childFiles);
    }
    return results;
  }
  return [];
}

export function FileManager({ appId, containerType = "dev" }: FileManagerProps) {
  const t = useTranslations("fileManager");
  const [fileList, setFileList] = useState<FileEntry[]>([]);
  const [filePath, setFilePath] = useState("");
  const [fileLoading, setFileLoading] = useState(false);
  const [view, setView] = useState<"list" | "editor">("list");
  const [editingFile, setEditingFile] = useState<string | null>(null);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Set webkitdirectory imperatively — React doesn't reliably pass it as a JSX prop
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute("webkitdirectory", "");
      folderInputRef.current.setAttribute("directory", "");
    }
  }, []);

  const fetchFiles = useCallback(
    async (subpath = "") => {
      setFileLoading(true);
      try {
        const qs = new URLSearchParams();
        if (subpath) qs.set("path", subpath);
        if (containerType !== "dev") qs.set("containerType", containerType);
        const params = qs.toString() ? `?${qs.toString()}` : "";
        const res = await fetch(`/api/apps/${appId}/files${params}`);
        const data = await res.json();
        if (data.files) {
          setFileList(data.files);
          setFilePath(subpath);
        }
      } catch {
        // ignore
      } finally {
        setFileLoading(false);
      }
    },
    [appId, containerType]
  );

  // Load root on mount (or when containerType changes)
  useEffect(() => {
    fetchFiles("");
  }, [fetchFiles]);

  const navigateToDir = (dirName: string) => {
    const newPath = filePath ? `${filePath}/${dirName}` : dirName;
    fetchFiles(newPath);
  };

  const navigateUp = () => {
    const parts = filePath.split("/").filter(Boolean);
    parts.pop();
    fetchFiles(parts.join("/"));
  };

  const openFile = (fileName: string) => {
    const fullPath = filePath ? `${filePath}/${fileName}` : fileName;
    setEditingFile(fullPath);
    setView("editor");
  };

  const backToList = () => {
    setView("list");
    setEditingFile(null);
    fetchFiles(filePath);
  };

  // Upload logic
  const uploadFiles = useCallback(
    async (files: Array<{ file: File; relativePath: string }>) => {
      if (files.length === 0) return;
      setUploading(true);
      setProgress({ done: 0, total: files.length });

      const formData = new FormData();
      formData.append("basePath", filePath);
      for (const { file, relativePath } of files) {
        formData.append("files", file);
        formData.append("relativePaths", relativePath);
      }

      try {
        const uploadQs = containerType !== "dev" ? `?containerType=${containerType}` : "";
        const res = await fetch(`/api/apps/${appId}/files${uploadQs}`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.uploaded) {
          setProgress({ done: data.uploaded, total: files.length });
        }
        fetchFiles(filePath);
      } catch {
        // ignore
      } finally {
        setTimeout(() => {
          setUploading(false);
          setProgress(null);
        }, 1000);
      }
    },
    [appId, filePath, fetchFiles, containerType]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;
    const files: Array<{ file: File; relativePath: string }> = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const relativePath =
        (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
      files.push({ file: f, relativePath });
    }
    uploadFiles(files);
    e.target.value = "";
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const allFiles: Array<{ file: File; relativePath: string }> = [];
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      const files = await readEntryFiles(entry, "");
      allFiles.push(...files);
    }

    uploadFiles(allFiles);
  };

  return (
    <div
      className="flex flex-1 flex-col rounded-b-lg border border-t-0 overflow-hidden bg-background min-h-0 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {view === "editor" && editingFile ? (
        <FileEditor appId={appId} filePath={editingFile} onBack={backToList} containerType={containerType} />
      ) : (
        <>
          {/* Path bar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40">
            {filePath && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={navigateUp}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            <span className="text-xs font-mono text-muted-foreground truncate flex-1">
              /{filePath}
            </span>

            {/* Upload & refresh buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title={t("uploadFiles")}
            >
              <Upload className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => folderInputRef.current?.click()}
              disabled={uploading}
              title={t("uploadFolder")}
            >
              <FolderUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => fetchFiles(filePath)}
              disabled={fileLoading}
              title={t("refresh")}
            >
              <RotateCw className={`h-3 w-3 ${fileLoading ? "animate-spin" : ""}`} />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {/* Upload progress */}
          {uploading && progress && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-blue-50 dark:bg-blue-950/30 text-xs text-blue-700 dark:text-blue-300">
              <RotateCw className="h-3 w-3 animate-spin" />
              Uploading {progress.done}/{progress.total} files...
            </div>
          )}

          {/* File list */}
          <div className="flex-1 overflow-auto">
            <FileList
              files={fileList}
              loading={fileLoading}
              onNavigateDir={navigateToDir}
              onOpenFile={openFile}
            />
          </div>
        </>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">{t("dropFilesHere")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
