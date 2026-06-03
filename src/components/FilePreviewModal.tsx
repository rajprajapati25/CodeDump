/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  X,
  Download,
  Share2,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  Copy,
  FolderOpen,
  RefreshCw,
  Clock,
  ExternalLink,
} from "lucide-react";
import { DriveItem } from "../types";
import { formatBytes, getFileIcon, getFileTypeLabel } from "./FileCard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: DriveItem | null;
  headers: Record<string, string>;
}

export default function FilePreviewModal({ isOpen, onClose, item, headers }: Props) {
  const [copied, setCopied] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const ext = item?.name.split(".").pop()?.toLowerCase();
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext || "");
  const isVideo = ["mp4", "mkv", "webm", "mov", "avi"].includes(ext || "");
  const isAudio = ["mp3", "wav", "ogg", "aac", "m4a"].includes(ext || "");
  const isText = ["js", "jsx", "ts", "tsx", "json", "html", "css", "py", "java", "go", "rs", "sh", "txt", "md"].includes(
    ext || ""
  );

  useEffect(() => {
    if (isOpen && item && isText) {
      fetchTextContent();
    } else {
      setTextContent(null);
    }
  }, [isOpen, item, isText]);

  const fetchTextContent = async () => {
    if (!item) return;
    setLoadingText(true);
    try {
      // Append query parameters if header overrides exist (for local testing credentials)
      const overrideQuery = Object.entries(headers)
        .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
        .join("&");

      const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
      const res = await fetch(`/api/raw?path=${encodeURIComponent(item.path)}${tokenParams}`);
      if (res.ok) {
        const txt = await res.text();
        setTextContent(txt);
      } else {
        setTextContent("Failed to load text preview.");
      }
    } catch (err) {
      console.error(err);
      setTextContent("Failed to load text preview content.");
    } finally {
      setLoadingText(false);
    }
  };

  if (!isOpen || !item) return null;

  // Build the permanent public sharing URL
  const getShareUrl = () => {
    // Generate private token-backed raw access URL for this specific path
    const overrideQuery = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    return `${window.location.origin}/api/raw?path=${encodeURIComponent(item.path)}${tokenParams}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDownload = () => {
    // Append headers as query params to authenticate local credentials if present
    const overrideQuery = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    window.open(`/api/raw?path=${encodeURIComponent(item.path)}&download=true${tokenParams}`, "_blank");
  };

  const shareUrl = getShareUrl();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
        {/* Left Side: Preview Pane */}
        <div className="flex-1 bg-slate-50 border-r border-slate-100 p-6 flex flex-col justify-center items-center min-h-[300px] md:min-h-[auto] max-h-[440px] md:max-h-none overflow-hidden relative">
          <div className="absolute top-4 left-4 bg-slate-100/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider backdrop-blur-xs">
            Live Preview
          </div>

          {isImage && (
            <img
              src={`${shareUrl}`}
              alt={item.name}
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[380px] object-contain rounded-lg shadow-sm bg-grid"
            />
          )}

          {isVideo && (
            <video
              src={`${shareUrl}`}
              controls
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[380px] rounded-lg shadow-sm bg-black"
            />
          )}

          {isAudio && (
            <div className="w-full max-w-sm p-6 bg-white rounded-2xl border border-slate-200/60 text-center space-y-4">
              <div className="w-16 h-16 bg-fuchsia-50 text-fuchsia-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                {getFileIcon(item.name, "file")}
              </div>
              <div>
                <h5 className="font-semibold text-slate-800 break-all">{item.name}</h5>
                <p className="text-xs text-slate-400 mt-1">Ready to playback</p>
              </div>
              <audio src={`${shareUrl}`} controls referrerPolicy="no-referrer" className="w-full mt-2" />
            </div>
          )}

          {isText && (
            <div className="w-full h-full max-h-[380px] rounded-xl border border-slate-200 bg-white shadow-inner flex flex-col overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-250/60 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold leading-none bg-slate-50/60">
                <span>{item.name}</span>
                <span>Plain Text Mode</span>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-slate-50 font-mono text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                {loadingText ? (
                  <div className="h-full flex items-center justify-center gap-2 text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Loading text data...
                  </div>
                ) : (
                  textContent || "Nothing to preview"
                )}
              </div>
            </div>
          )}

          {!isImage && !isVideo && !isAudio && !isText && (
            <div className="text-center space-y-4 max-w-xs">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                {getFileIcon(item.name, item.type)}
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 break-words">{item.name}</h4>
                <p className="text-xs text-slate-400 mt-1 select-none">
                  Exact inline preview is not supported for this format. You can download or access the raw file below.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="mx-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Direct Download
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Meta Info & Actions */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between max-h-[50vh] md:max-h-none overflow-y-auto">
          {/* Top Panel */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg break-words leading-snug line-clamp-2" title={item.name}>
                  {item.name}
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{getFileTypeLabel(item.name, item.type)}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-150 text-slate-400 hover:text-slate-600 rounded-lg shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Properties */}
            <div className="space-y-3 mt-6 border-t border-slate-100 pt-4">
              <div className="flex items-start gap-3">
                <FileText className="w-4.5 h-4.5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Size</div>
                  <div className="text-xs font-semibold text-slate-750">{formatBytes(item.size)}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Layers className="w-4.5 h-4.5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Git Path</div>
                  <div className="text-xs font-mono text-slate-500 break-all">{item.path}</div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4.5 h-4.5 text-slate-400 mt-0.5" />
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Raw Sharing URL</div>
                  <div className="text-xs font-medium text-slate-500 line-clamp-1 break-all" title={shareUrl}>
                    {shareUrl}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Actions Panel */}
          <div className="mt-8 space-y-2 pt-4 border-t border-slate-100">
            {/* Share Link Action */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
                <Share2 className="w-3.5 h-3.5 text-slate-400 animate-pulse" /> Public Publicly Shared Forever Link
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  readOnly
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500 rounded-xl focus:outline-none focus:ring-0 truncate font-mono select-all"
                  value={shareUrl}
                />
                <button
                  onClick={handleCopyLink}
                  className={`p-2 rounded-xl transition-all border cursor-pointer shrink-0 ${
                    copied
                      ? "bg-emerald-50 border-emerald-250 text-emerald-600"
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-500"
                  }`}
                  title="Copy link to clipboard"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={handleDownload}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/10 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Save Local
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2 bg-slate-100 hover:bg-slate-150 text-slate-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors text-center"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View Raw
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
