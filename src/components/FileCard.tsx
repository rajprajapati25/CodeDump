/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Folder,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  File,
  Eye,
  Trash2,
  FolderOpen,
  Edit2,
  History,
  Share2,
  Download,
  CheckCircle,
} from "lucide-react";
import { DriveItem } from "../types";

interface Props {
  key?: React.Key | string;
  item: DriveItem;
  onClick: () => void;
  onRename: () => void;
  onDelete: () => void;
  onHistory: () => void;
  onShare: () => void;
  onDownload: () => void;
  justCopied: boolean;
}

export function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "—";
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["KB", "MB", "GB", "TB"];
  // GitHub returns sizes in bytes or kilobytes depending, but mostly in normal bytes limit
  // Let's print sizes correctly
  if (bytes < k) {
    return `${bytes} Bytes`;
  }
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i - 1];
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function getFileIcon(name: string, type: "file" | "dir") {
  if (type === "dir") {
    return <Folder className="w-10 h-10 text-amber-500 fill-amber-500/10" />;
  }

  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "webp":
    case "svg":
    case "bmp":
    case "ico":
      return <FileImage className="w-10 h-10 text-emerald-500 fill-emerald-500/5" />;
    case "mp4":
    case "mkv":
    case "webm":
    case "mov":
    case "avi":
      return <FileVideo className="w-10 h-10 text-indigo-500 fill-indigo-500/5" />;
    case "mp3":
    case "wav":
    case "ogg":
    case "aac":
    case "m4a":
      return <FileAudio className="w-10 h-10 text-fuchsia-500 fill-fuchsia-500/5" />;
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "json":
    case "html":
    case "css":
    case "py":
    case "java":
    case "go":
    case "rs":
    case "sh":
    case "yml":
    case "yaml":
      return <FileCode className="w-10 h-10 text-purple-500 fill-purple-500/5" />;
    case "zip":
    case "rar":
    case "7z":
    case "tar":
    case "gz":
      return <FileArchive className="w-10 h-10 text-yellow-600 fill-yellow-600/5" />;
    case "pdf":
      return <FileText className="w-10 h-10 text-rose-500 fill-rose-500/5" />;
    case "doc":
    case "docx":
    case "xls":
    case "xlsx":
    case "ppt":
    case "pptx":
    case "txt":
    case "md":
      return <FileText className="w-10 h-10 text-blue-500 fill-blue-500/5" />;
    default:
      return <File className="w-10 h-10 text-slate-400 fill-slate-400/5" />;
  }
}

export function getFileTypeLabel(name: string, type: "file" | "dir"): string {
  if (type === "dir") return "Folder";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (!ext) return "File";
  const map: Record<string, string> = {
    pdf: "PDF Document",
    png: "PNG Image",
    jpg: "JPEG Image",
    jpeg: "JPEG Image",
    webp: "WEBP Image",
    gif: "GIF Image",
    svg: "Vector Icon",
    mp4: "MPEG Video",
    mp3: "MPEG Audio",
    wav: "WAV Audio",
    txt: "Text Document",
    md: "Markdown File",
    ts: "TypeScript Source",
    tsx: "React Component",
    js: "JavaScript Source",
    json: "JSON Config",
    html: "HTML Landing",
    css: "Stylesheet",
    zip: "Compressed Folder",
    rar: "RAR Archive",
  };
  return map[ext] || `${ext.toUpperCase()} Source File`;
}

export default function FileCard({
  item,
  onClick,
  onRename,
  onDelete,
  onHistory,
  onShare,
  onDownload,
  justCopied,
}: Props) {
  const isDir = item.type === "dir";

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border border-slate-250/60 hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/5 rounded-2xl p-4.5 select-none transition-all duration-200 cursor-pointer flex flex-col justify-between`}
    >
      {/* Absolute Quick Action Controls (Hidden by default, animation triggers on hover) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 bg-white/70 backdrop-blur-sm pl-1.5 py-0.5 rounded-lg z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
          title="Rename"
          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {!isDir && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onHistory();
            }}
            title="Version History"
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        )}

        {!isDir && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            title="Copy Public Link"
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-md transition-colors"
          >
            {justCopied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
          </button>
        )}

        {!isDir && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            title="Download file"
            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-750 rounded-md transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-md transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main card contents */}
      <div>
        <div className="mb-4">{getFileIcon(item.name, item.type)}</div>

        <h4
          title={item.name}
          className="text-sm font-semibold text-slate-800 break-words line-clamp-1 group-hover:text-blue-600 transition-colors"
        >
          {item.name}
        </h4>
        <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400 font-medium">
          <span className="uppercase truncate">
            {isDir ? "Folder" : getFileTypeLabel(item.name, item.type)}
          </span>
          <span className="italic shrink-0 font-normal">
            {formatDate(item.lastModified)}
          </span>
        </div>
      </div>

      {/* Bottom details panel */}
      <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>{!isDir && formatBytes(item.size)}</span>
        <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 font-semibold">
          {isDir ? (
            <>
              Open Folder <FolderOpen className="w-3 h-3" />
            </>
          ) : (
            <>
              Preview <Eye className="w-3 h-3" />
            </>
          )}
        </span>
      </div>
    </div>
  );
}
