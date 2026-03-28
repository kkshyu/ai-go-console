"use client";

import { useTranslations } from "next-intl";
import { RotateCw, Folder, File, FolderOpen } from "lucide-react";

export interface FileEntry {
  name: string;
  type: "file" | "directory";
  size: number;
  mtime: string;
}

interface FileListProps {
  files: FileEntry[];
  loading: boolean;
  onNavigateDir: (dirName: string) => void;
  onOpenFile: (fileName: string) => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, loading, onNavigateDir, onOpenFile }: FileListProps) {
  const t = useTranslations("fileManager");
  const tc = useTranslations("common");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <RotateCw className="h-4 w-4 animate-spin mr-2" />
        {tc("loading")}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-12 text-muted-foreground">
        <FolderOpen className="h-10 w-10 mb-3 opacity-20" />
        <p className="text-sm font-medium">{t("emptyDirectory")}</p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b bg-muted/30">
          <th className="text-left px-3 py-1.5 font-medium text-muted-foreground">{t("name")}</th>
          <th className="text-right px-3 py-1.5 font-medium text-muted-foreground w-20">{t("size")}</th>
        </tr>
      </thead>
      <tbody>
        {files.map((f) => (
          <tr
            key={f.name}
            className="border-b last:border-0 hover:bg-muted/20 cursor-pointer"
            onClick={() =>
              f.type === "directory" ? onNavigateDir(f.name) : onOpenFile(f.name)
            }
          >
            <td className="px-3 py-1.5 font-mono">
              <span className="flex items-center gap-2">
                {f.type === "directory" ? (
                  <Folder className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                ) : (
                  <File className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                {f.name}
              </span>
            </td>
            <td className="px-3 py-1.5 text-right text-muted-foreground">
              {f.type === "file" ? formatFileSize(f.size) : "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
