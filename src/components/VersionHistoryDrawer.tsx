/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { History, X, User, Calendar, GitCommit, Download, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { CommitInfo, DriveItem } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: DriveItem | null;
  headers: Record<string, string>;
  onRestore: (file: DriveItem, rollbackCommit: CommitInfo) => Promise<void>;
}

export default function VersionHistoryDrawer({ isOpen, onClose, item, headers, onRestore }: Props) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoringSha, setRestoringSha] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      fetchHistory();
    }
  }, [isOpen, item]);

  const fetchHistory = async () => {
    if (!item) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/history?path=${encodeURIComponent(item.path)}`, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load history (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCommits(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load version logs.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !item) return null;

  const handleDownloadRef = (commit: CommitInfo) => {
    // Generate private token-backed raw access URL for this specific commit ref
    const overrideQuery = Object.entries(headers)
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    window.open(`/api/raw?path=${encodeURIComponent(item.path)}&ref=${commit.sha}&download=true${tokenParams}`, "_blank");
  };

  const handleRestoreRef = async (commit: CommitInfo) => {
    setRestoringSha(commit.sha);
    setErrorMsg("");
    try {
      await onRestore(item, commit);
      // Wait shortly and reload history logs
      setTimeout(() => {
        fetchHistory();
      }, 500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to restore past version.");
    } finally {
      setRestoringSha(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 border-l border-slate-100 animate-slide-in">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base line-clamp-1">Version History</h3>
              <p className="text-xs text-slate-500 truncate max-w-[240px]">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
            <div className="flex gap-2 text-blue-800 text-xs leading-relaxed">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">GitHub Versioning Active!</span> Setiap unggahan, perubahan nama, atau
                penggantian berkas dicatat otomatis sebagai Git Commit, melacak riwayat secara real-time yang abadi.
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Operations Error
              </div>
              <div>{errorMsg}</div>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm font-medium">Reading git logs...</span>
            </div>
          ) : commits.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-1.5">
              <GitCommit className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-medium">No version logs found</p>
              <p className="text-xs">Upload changes to record commits.</p>
            </div>
          ) : (
            <div className="relative border-l border-slate-200 ml-4.5 pl-5.5 space-y-6">
              {commits.map((commit, index) => {
                const isCurrent = index === 0;
                const dateString = new Date(commit.date).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div key={commit.sha} className="relative group">
                    {/* Badge circle */}
                    <span
                      className={`absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                        isCurrent ? "border-blue-500 ring-4 ring-blue-50" : "border-slate-300"
                      }`}
                    >
                      {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 font-bold font-mono tracking-wide uppercase bg-slate-100/80 px-1.5 py-0.5 rounded">
                          {commit.sha.substring(0, 7)}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Latest Version
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-800 break-words leading-relaxed">
                        {commit.message}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> {commit.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {dateString}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownloadRef(commit)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> Download at this sha
                        </button>

                        {!isCurrent && (
                          <button
                            onClick={() => handleRestoreRef(commit)}
                            disabled={restoringSha !== null}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 disabled:bg-slate-50 disabled:text-slate-400 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {restoringSha === commit.sha ? (
                              <>
                                <RefreshCw className="w-3 h-3 animate-spin" /> Restoring...
                              </>
                            ) : (
                              "Restore Version"
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
