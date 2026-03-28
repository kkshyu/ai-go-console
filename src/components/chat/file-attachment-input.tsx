"use client";

import { useState, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Paperclip, X, FileText, Image as ImageIcon, FileCode, File, Loader2 } from "lucide-react";

export interface FileAttachment {
  id: string;
  name: string;
  type: "image" | "text" | "code" | "pdf" | "unknown";
  sizeBytes: number;
  preview?: string;
  status: "uploading" | "uploaded" | "processing" | "ready" | "error";
}

export interface FileAttachmentInputHandle {
  triggerFileSelect: () => void;
}

interface FileAttachmentInputProps {
  attachments: FileAttachment[];
  onAttachmentsChange: (attachments: FileAttachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  maxSizeMB?: number;
  hideButton?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(type: string) {
  switch (type) {
    case "image":
      return <ImageIcon className="h-3.5 w-3.5" />;
    case "code":
      return <FileCode className="h-3.5 w-3.5" />;
    case "pdf":
      return <FileText className="h-3.5 w-3.5" />;
    default:
      return <File className="h-3.5 w-3.5" />;
  }
}

export const FileAttachmentInput = forwardRef<FileAttachmentInputHandle, FileAttachmentInputProps>(function FileAttachmentInput({
  attachments,
  onAttachmentsChange,
  disabled = false,
  maxFiles = 5,
  maxSizeMB = 10,
  hideButton = false,
}, ref) {
  const t = useTranslations("chat");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    triggerFileSelect: () => fileInputRef.current?.click(),
  }));
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const remaining = maxFiles - attachments.length;
      if (remaining <= 0) return;

      const toUpload = files.slice(0, remaining);
      const maxBytes = maxSizeMB * 1024 * 1024;

      // Filter out oversized files
      const valid = toUpload.filter((f) => f.size <= maxBytes);

      if (valid.length === 0) return;

      // Create temporary attachments with uploading status
      const tempAttachments: FileAttachment[] = valid.map((f) => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        type: detectType(f),
        sizeBytes: f.size,
        status: "uploading" as const,
      }));

      onAttachmentsChange([...attachments, ...tempAttachments]);

      // Upload to API
      const formData = new FormData();
      for (const file of valid) {
        formData.append("files", file);
      }
      try {
        const res = await fetch("/api/chat/files", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        const uploadedFiles: FileAttachment[] = data.files
          .filter((f: { id?: string; error?: string }) => f.id)
          .map((f: { id: string; name: string; type: string; sizeBytes: number; preview?: string; status: string }) => ({
            id: f.id,
            name: f.name,
            type: f.type,
            sizeBytes: f.sizeBytes,
            preview: f.preview,
            status: f.status as FileAttachment["status"],
          }));

        // Replace temp attachments with real ones
        onAttachmentsChange([
          ...attachments,
          ...uploadedFiles,
        ]);
      } catch {
        // Remove temp attachments on error
        onAttachmentsChange(attachments);
      }
    },
    [attachments, onAttachmentsChange, maxFiles, maxSizeMB],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(e.target.files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFiles],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      onAttachmentsChange(attachments.filter((a) => a.id !== id));
    },
    [attachments, onAttachmentsChange],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer.files?.length) {
        uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
  );

  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/5">
          <p className="text-sm text-primary">{t("dropFilesHere")}</p>
        </div>
      )}

      {/* Attachment chips */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
            >
              {attachment.status === "uploading" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              ) : attachment.type === "image" && attachment.preview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={attachment.preview}
                  alt={attachment.name}
                  className="h-6 w-6 rounded object-cover"
                />
              ) : (
                getFileIcon(attachment.type)
              )}
              <span className="max-w-[120px] truncate">{attachment.name}</span>
              <span className="text-muted-foreground">
                {formatFileSize(attachment.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(attachment.id)}
                className="ml-0.5 rounded-sm p-0.5 hover:bg-muted"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
        accept="image/*,.txt,.md,.ts,.tsx,.js,.jsx,.py,.json,.csv,.html,.css,.yaml,.yml,.toml,.xml,.sql,.sh,.go,.rs,.java,.kt,.swift,.rb,.php,.c,.cpp,.h,.hpp,.vue,.svelte,.prisma,.graphql,.pdf,.log,.env,.ini,.cfg,.conf"
      />

      {/* Attach button */}
      {!hideButton && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || attachments.length >= maxFiles}
          title={t("attachFile")}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
});

function detectType(file: File): FileAttachment["type"] {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (
    file.type.startsWith("text/") ||
    file.type === "application/json" ||
    /\.(ts|tsx|js|jsx|py|go|rs|java|kt|swift|rb|php|c|cpp|h|hpp|vue|svelte|sql|sh|yaml|yml|toml|json|csv|md|prisma|graphql|log|env|ini|cfg|conf)$/i.test(file.name)
  ) {
    return "code";
  }
  return "unknown";
}
