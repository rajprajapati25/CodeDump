/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Github, Key, Terminal, FolderGit2, X, RefreshCw } from "lucide-react";
import { GithubCredentials } from "../types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  savedCredentials: GithubCredentials | null;
  onSave: (creds: GithubCredentials) => void;
  onClear: () => void;
  hasEnvConfig: boolean;
}

export default function GithubCredentialsModal({
  isOpen,
  onClose,
  savedCredentials,
  onSave,
  onClear,
  hasEnvConfig,
}: Props) {
  const [token, setToken] = useState(savedCredentials?.token || "");
  const [owner, setOwner] = useState(savedCredentials?.owner || "");
  const [repo, setRepo] = useState(savedCredentials?.repo || "");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [errMessage, setErrMessage] = useState("");

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !owner || !repo) {
      setErrMessage("Please fill in all credentials fields.");
      setTestStatus("error");
      return;
    }

    setTestStatus("testing");
    setErrMessage("");

    try {
      // Test the repo contents listing
      const res = await fetch(`/api/files`, {
        headers: {
          "x-github-token": token,
          "x-github-owner": owner,
          "x-github-repo": repo,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      setTestStatus("success");
      onSave({ token, owner, repo });
      setTimeout(() => {
        onClose();
        setTestStatus("idle");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setTestStatus("error");
      setErrMessage(err.message || "Failed to retrieve git repository data.");
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-lg">GitHub Drive Storage</h3>
              <p className="text-xs text-slate-500">Repository Connection Setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} className="p-6 space-y-4">
          {hasEnvConfig && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs space-y-1">
              <div className="font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System Connection Available
              </div>
              <p className="text-emerald-700/80">
                Server-side environment variables are active. Local overrides are optional.
              </p>
            </div>
          )}

          {!hasEnvConfig && !savedCredentials && (
            <div className="p-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl text-xs space-y-1">
              <div className="font-medium flex items-center gap-1.5 text-amber-900">
                ⚠️ Environment Config Not Standardized
              </div>
              <p className="text-amber-700/85">
                To start, enter details here to bind this browser to your own GitHub Private Repository! Or configure
                variables on server side.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-slate-400" />
              GitHub Personal Access Token (PAT)
            </label>
            <input
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 leading-normal">
              Needs <b>repo</b> write permissions (accessing raw content + committing modifications).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                Username / Org
              </label>
              <input
                type="text"
                placeholder="octocat"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                Private Repo Name
              </label>
              <input
                type="text"
                placeholder="private-drive"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
              />
            </div>
          </div>

          {errMessage && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 break-words font-medium">
              {errMessage}
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {savedCredentials ? (
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setToken("");
                  setOwner("");
                  setRepo("");
                  onClose();
                }}
                className="px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                Clear Override
              </button>
            ) : (
              <div />
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={testStatus === "testing"}
                className={`px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-600/10 transition-colors cursor-pointer`}
              >
                {testStatus === "testing" ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : testStatus === "success" ? (
                  "Connected!"
                ) : (
                  "Test & Save"
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
