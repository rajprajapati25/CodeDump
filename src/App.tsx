import React, { useState, useEffect } from "react";
import {
  Cloud,
  Search,
  Settings,
  Plus,
  ArrowRight,
  Menu,
  Shield,
  FolderPlus,
  RefreshCw,
  FolderOpen,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  Link,
  Github,
  AlertCircle,
  AlertTriangle,
  Database,
  Grid,
  List,
  Edit2,
  Trash2,
  History,
  Share2,
  Download,
  CheckCircle,
  Eye,
  X,
  Filter,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownNarrowWide,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import FileCard, { formatBytes, getFileIcon, getFileTypeLabel, formatDate } from "./components/FileCard";
import GithubCredentialsModal from "./components/GithubCredentialsModal";
import FilePreviewModal from "./components/FilePreviewModal";
import VersionHistoryDrawer from "./components/VersionHistoryDrawer";
import { DriveItem, GithubCredentials, CommitInfo } from "./types";
import CodeDump from "../assets/codedump_64x64.png";

export default function App() {
  const [view, setView] = useState<"drive" | "trash">("drive");
  const [currentPath, setCurrentPath] = useState("uploads/drive");
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<"list" | "grid">("list");

  // Sorting state
  const [sortBy, setSortBy] = useState<"name" | "size">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Connection configurations
  const [configStatus, setConfigStatus] = useState<{
    hasEnvConfig: boolean;
    username: string;
    repo: string;
  } | null>(null);

  const [savedCredentials, setSavedCredentials] = useState<GithubCredentials | null>(null);

  // Interactive controls
  const [isCredentialsOpen, setIsCredentialsOpen] = useState(false);
  const [activePreviewItem, setActivePreviewItem] = useState<DriveItem | null>(null);
  const [activeHistoryItem, setActiveHistoryItem] = useState<DriveItem | null>(null);
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);

  // Modals for actions
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState("");

  // Drag and drop uploading zone
  const [isDragging, setIsDragging] = useState(false);

  // Initialize and load configurations
  useEffect(() => {
    const local = localStorage.getItem("github_storage_creds");
    if (local) {
      try {
        setSavedCredentials(JSON.parse(local));
      } catch (err) {
        console.error("Failed loading local credentials cache", err);
      }
    }
    fetchConfigStatus();
  }, []);

  const fetchConfigStatus = async () => {
    try {
      const res = await fetch("/api/config-status");
      if (res.ok) {
        const data = await res.json();
        setConfigStatus(data);
      }
    } catch (err) {
      console.error("Error reading backend configure logs", err);
    }
  };

  const isConfigured = !!(configStatus?.hasEnvConfig || savedCredentials);

  // Sync effect to list content when path, view, or credentials shift
  useEffect(() => {
    if (isConfigured) {
      loadCurrentFiles();
    }
  }, [currentPath, view, savedCredentials, isConfigured]);

  // Adjust path when category view changes
  useEffect(() => {
    if (view === "drive") {
      setCurrentPath("uploads/drive");
    } else {
      setCurrentPath("uploads/trash");
    }
  }, [view]);

  // Read request headers to include client token override
  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (savedCredentials) {
      headers["x-github-token"] = savedCredentials.token;
      headers["x-github-owner"] = savedCredentials.owner;
      headers["x-github-repo"] = savedCredentials.repo;
    }
    return headers;
  };

  const loadCurrentFiles = async () => {
    setIsLoading(true);
    setErrorBanner("");
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }
      const data = await res.json();
      setFiles(data);
    } catch (err: any) {
      console.error(err);
      setErrorBanner(
        err.message || "Unable to parse files structure from the repos. Setup custom authorization to begin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sorting logic
  const sortFiles = (files: DriveItem[]) => {
    return [...files].sort((a, b) => {
      if (sortBy === "name") {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === "asc" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      } else {
        const sizeA = a.size || 0;
        const sizeB = b.size || 0;
        return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
      }
    });
  };

  const handleSort = (newSortBy: "name" | "size") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder(newSortBy === "size" ? "desc" : "asc");
    }
  };

  // Convert File object to Base64 data and deliver to API
  const handleUploadFile = (file: File) => {
    if (!isConfigured) return;
    setUploadProgress(10);
    setErrorBanner("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64String = (reader.result as string).split(",")[1];
        setUploadProgress(40);

        const matchedExisting = files.find((item) => item.name.toLowerCase() === file.name.toLowerCase());
        const sha = matchedExisting?.type === "file" ? matchedExisting.sha : undefined;

        setUploadProgress(70);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            fileName: file.name,
            path: currentPath,
            content: base64String,
            sha,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "File upload transaction failed.");
        }

        setUploadProgress(100);
        setTimeout(() => {
          setUploadProgress(null);
          loadCurrentFiles();
        }, 600);
      };
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || "Failed to finalize uploads.");
      setUploadProgress(null);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setErrorBanner("");
    setIsCreateFolderOpen(false);

    try {
      const res = await fetch("/api/create-folder", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          folderPath: currentPath,
          folderName: newFolderName.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Unsuccessful directory creation.");
      }

      setNewFolderName("");
      loadCurrentFiles();
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || "Could not spin up blank directory placeholder.");
    }
  };

  const handleRename = async (item: DriveItem) => {
    const isDir = item.type === "dir";
    const label = isDir ? "folder" : "file";
    const newName = prompt(`Rename selected ${label} "${item.name}":`, item.name);
    if (!newName || newName.trim() === item.name) return;
    setErrorBanner("");

    try {
      setIsLoading(true);
      const res = await fetch("/api/rename", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          path: item.path,
          sha: item.sha,
          newName: newName.trim(),
          type: item.type,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Rename operations halted on server.");
      }

      loadCurrentFiles();
    } catch (err: any) {
      console.error(err);
      setErrorBanner(err.message || "Could not finish rename operations.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (item: DriveItem) => {
    if (view === "drive") {
      const ok = confirm(`Move "${item.name}" to Trash bin?`);
      if (!ok) return;

      try {
        setIsLoading(true);
        const res = await fetch("/api/rename", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            path: item.path,
            sha: item.sha,
            newPath: `uploads/trash/${item.name}`,
            type: item.type,
          }),
        });

        if (!res.ok) {
          throw new Error("Unable to move file to trash folder logs.");
        }

        loadCurrentFiles();
      } catch (err: any) {
        console.error(err);
        setErrorBanner(err.message || "Failed moving storage item to virtual recycle folder.");
      } finally {
        setIsLoading(false);
      }
    } else {
      const ok = confirm(`WARNING: Are you sure you want to permanently delete "${item.name}" from GitHub repository? This has no undo.`);
      if (!ok) return;

      try {
        setIsLoading(true);
        const res = await fetch("/api/delete", {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            path: item.path,
            sha: item.sha,
            type: item.type,
          }),
        });

        if (!res.ok) {
          throw new Error("Permanent deletion error response on Git controller.");
        }

        loadCurrentFiles();
      } catch (err: any) {
        console.error(err);
        setErrorBanner(err.message || "Purge execution failed.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleShareLink = (item: DriveItem) => {
    const overrideQuery = Object.entries(getHeaders())
      .filter(([k]) => k !== "Content-Type")
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    const publicUrl = `${window.location.origin}/api/raw?path=${encodeURIComponent(item.path)}${tokenParams}`;

    navigator.clipboard.writeText(publicUrl);
    setCopiedFileId(item.sha);
    setTimeout(() => {
      setCopiedFileId(null);
    }, 2000);
  };

  const handleDownload = (item: DriveItem) => {
    const overrideQuery = Object.entries(getHeaders())
      .filter(([k]) => k !== "Content-Type")
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    window.open(`/api/raw?path=${encodeURIComponent(item.path)}&download=true${tokenParams}`, "_blank");
  };

  // High-fidelity tabbed iframe renderer injection
  const handleIframeTabPreview = (item: DriveItem) => {
    const overrideQuery = Object.entries(getHeaders())
      .filter(([k]) => k !== "Content-Type")
      .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
      .join("&");

    const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
    const rawUrl = `/api/raw?path=${encodeURIComponent(item.path)}${tokenParams}`;

    const previewTab = window.open("", "_blank");
    if (!previewTab) {
      alert("Popup blocked! Please allow popups to view this frame preview layout.");
      return;
    }

    // Write interactive workspace frame markup cleanly to bypass raw plain layout boundaries
    previewTab.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Desktop Preview - ${item.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: #f1f5f9; margin: 0; font-family: system-ui, sans-serif; }
        </style>
      </head>
      <body class="h-screen flex flex-col overflow-hidden">
        <header class="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-6 z-10 shrink-0">
          <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full bg-red-400"></span>
            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
            <h1 class="text-xs font-bold text-slate-700 ml-2 tracking-tight truncate max-w-xs">${item.name}</h1>
          </div>
          <div class="bg-slate-100 rounded-lg px-4 py-1 text-[11px] font-mono text-slate-500 border border-slate-200/60 max-w-md truncate">
            ${window.location.origin}${item.path}
          </div>
          <div class="text-xs font-semibold text-slate-400 uppercase tracking-widest text-[10px]">
            Desktop Workspace View Mode
          </div>
        </header>

        <main class="flex-1 p-6 flex justify-center items-center overflow-auto bg-slate-100">
          <div class="w-full h-full max-w-6xl bg-white shadow-2xl rounded-xl border border-slate-200/80 overflow-hidden flex flex-col transition-all">
            <iframe 
              src="${rawUrl}" 
              class="w-full h-full flex-1 border-none bg-white" 
              title="Desktop Document Frame Sandbox View"
              sandbox="allow-scripts allow-same-origin allow-forms"
            ></iframe>
          </div>
        </main>
      </body>
      </html>
    `);
    previewTab.document.close();
  };

  const handleRestoreVersion = async (file: DriveItem, rollbackCommit: CommitInfo) => {
    try {
      const overrideQuery = Object.entries(getHeaders())
        .filter(([k]) => k !== "Content-Type")
        .map(([k, v]) => `${k.toLowerCase()}=${encodeURIComponent(v)}`)
        .join("&");

      const tokenParams = overrideQuery ? `&${overrideQuery}` : "";
      const fetchOldUrl = `/api/raw?path=${encodeURIComponent(file.path)}&ref=${rollbackCommit.sha}${tokenParams}`;

      const resBytes = await fetch(fetchOldUrl);
      if (!resBytes.ok) {
        throw new Error("Could not pull specified git historic blob.");
      }

      const arrBuffer = await resBytes.arrayBuffer();
      const base64Content = btoa(
        new Uint8Array(arrBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      const resUpload = await fetch("/api/upload", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          fileName: file.name,
          path: file.path.substring(0, file.path.lastIndexOf("/")),
          content: base64Content,
          sha: file.sha,
        }),
      });

      if (!resUpload.ok) {
        const errJson = await resUpload.json().catch(() => ({}));
        throw new Error(errJson.error || "Rolled back upload creation failed.");
      }

      setActiveHistoryItem(null);
      loadCurrentFiles();
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Navigating up the folders
  const handleNavigateUp = () => {
    if (currentPath === "uploads/drive" || currentPath === "uploads/trash") return;
    const parts = currentPath.split("/");
    parts.pop();
    setCurrentPath(parts.join("/"));
  };

  const handleNavigateBreadcrumb = (index: number) => {
    const parts = currentPath.split("/");
    const newParts = parts.slice(0, index + 1);
    setCurrentPath(newParts.join("/"));
  };

  // Drag over files support
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isConfigured) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isConfigured) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  // Statistics
  const totalFoldersCount = files.filter((f) => f.type === "dir").length;
  const totalFilesCount = files.filter((f) => f.type === "file").length;
  const totalBytesSum = files.reduce((acc, f) => acc + (f.size || 0), 0);
  const storageUsedMBString = (totalBytesSum / 1024 / 1024).toFixed(3);

  // Filter and sort components
  const filteredFiles = sortFiles(files.filter((file) => file.name.toLowerCase().includes(searchQuery.toLowerCase())));

  // Active breadcrumbs tags mapping
  const pathParts = currentPath.split("/");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar Layout spanning from very top */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden transition-opacity ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div
        className={`absolute md:relative z-50 md:z-10 h-full shadow-2xl md:shadow-none transition-transform duration-300 flex-shrink-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar
          view={view}
          setView={(v) => {
            setView(v);
            setIsSidebarOpen(false);
          }}
          totalFiles={totalFilesCount}
          totalFolders={totalFoldersCount}
          storageUsedMB={storageUsedMBString}
          onOpenCredentials={() => {
            setIsCredentialsOpen(true);
            setIsSidebarOpen(false);
          }}
          isConfigured={isConfigured}
          onUploadSelect={handleUploadFile}
          onCreateFolderSelect={() => {
            setIsCreateFolderOpen(true);
            setIsSidebarOpen(false);
          }}
          uploadProgress={uploadProgress}
        />
      </div>

      {/* Main Flex Column for Header and Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* 1. Header Navigation Bar */}
        <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 select-none z-20">
          <div className="flex items-center gap-3 w-64 md:w-auto">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo shown only on mobile header since it is now in the sidebar */}
            <div className="flex items-center gap-2 md:hidden">
              <img src={CodeDump} alt="CodeDump Logo" width={20} height={20} className="rounded-sm" />
              <span className="font-bold text-lg tracking-tight text-slate-800">CodeDump</span>
            </div>
          </div>

          {/* Dynamic Search Bar (Responsive sizing) */}
          <div className="flex-1 max-w-2xl px-8 hidden sm:block">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search in uploads..."
                className="w-full bg-slate-100 border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 text-slate-700 outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Sync Status details section */}
          <div className="flex items-center gap-4 w-64 justify-end">
            <div className="flex flex-col items-end shrink-0 select-none">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                {isConfigured ? "Synced" : "Offline"}
              </span>
              <span className="text-xs text-slate-500">
                {isConfigured ? "repo @ private" : "awaiting config"}
              </span>
            </div>

            <button
              onClick={() => setIsCredentialsOpen(true)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
                isConfigured
                  ? "bg-slate-105 border-slate-200 text-slate-650 hover:bg-slate-200"
                  : "bg-amber-400 border-amber-500 text-amber-950 hover:bg-amber-500"
              }`}
              title={isConfigured ? "GitHub Storage Configured" : "Required Setup Configuration"}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Mobile responsive search widget */}
        <div className="sm:hidden bg-white border-b border-slate-100 px-4 py-2 z-10 flex sm:hidden">
          <div className="w-full flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full text-xs text-slate-705 outline-none bg-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 2. Main Portal Area */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 3. Primary Grid Display Zone / Drag Over trigger */}
          <main
            className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drag Overlay visual banner */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-600/10 backdrop-blur-xs ring-4 ring-blue-500/30 font-medium text-blue-600 border-4 border-dashed border-blue-500 rounded-2xl m-6 z-50 flex flex-col items-center justify-center gap-3 animate-fade-in pointer-events-none">
                <Plus className="w-12 h-12 text-blue-600 animate-bounce" />
                <span className="text-lg font-bold select-none">Drop file to upload to {pathParts[pathParts.length - 1] === "drive" ? "My Drive" : pathParts[pathParts.length - 1]}</span>
              </div>
            )}

            {/* Breadcrumbs Navigation Row with layout view options */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/60 flex-wrap gap-4 select-none">
              <div className="flex items-center gap-1 my-1 flex-wrap">
                {pathParts.map((part, index) => {
                  const label = index === 0 ? "GitHub Cloud" : index === 1 && part === "drive" ? "My Drive" : index === 1 && part === "trash" ? "Trash Store" : part;
                  const isLast = index === pathParts.length - 1;

                  return (
                    <React.Fragment key={index}>
                      {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-350 shrink-0" />}
                      <button
                        disabled={isLast}
                        onClick={() => handleNavigateBreadcrumb(index)}
                        className={`text-sm tracking-tight font-semibold hover:text-blue-600 transition-colors ${
                          isLast ? "text-slate-900" : "text-slate-400 cursor-pointer"
                        }`}
                      >
                        {label}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-0.5 rounded-lg flex items-center shrink-0 border border-slate-200/50">
                  <button
                    onClick={() => setLayoutMode("list")}
                    className={`p-1.5 rounded-md transition-all ${
                      layoutMode === "list"
                        ? "bg-white text-slate-800 shadow-xs"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="High Density List Table"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setLayoutMode("grid")}
                    className={`p-1.5 rounded-md transition-all ${
                      layoutMode === "grid"
                        ? "bg-white text-slate-800 shadow-xs"
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                    title="Compact Grid view"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                </div>

                {/* A-Z / Z-A Button */}
                <button
                  onClick={() => handleSort("name")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={sortBy === "name" ? (sortOrder === "asc" ? "Sort Z-A" : "Sort A-Z") : "Sort by Name (A-Z)"}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {sortBy === "name" ? (sortOrder === "asc" ? "A-Z" : "Z-A") : "Name"}
                  </span>
                </button>

                {/* Size Button */}
                <button
                  onClick={() => handleSort("size")}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  title={sortBy === "size" ? (sortOrder === "desc" ? "Sort Low-High" : "Sort Large-Low") : "Sort by Size (Large-Low)"}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {sortBy === "size" ? (sortOrder === "desc" ? "Large→Low" : "Low→Large") : "Size"}
                  </span>
                </button>

                {currentPath !== "uploads/drive" && currentPath !== "uploads/trash" && (
                  <button
                    onClick={handleNavigateUp}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-600 font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                )}
              </div>
            </div>

            {/* Setup Alert banner if not configured yet */}
            {!isConfigured && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-250/60 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
                    <AlertCircle className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">GitHub Credentials Required</h4>
                    <p className="text-xs text-amber-700/85 mt-1 leading-normal max-w-xl">
                      No active credentials. Bind your private GitHub Token and Repository details by setting them in
                      environment variables or clicking <b>Storage Config</b> above to save details client-side.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCredentialsOpen(true)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 font-semibold text-xs text-white rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
                >
                  Add Credentials <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {errorBanner && (
              <div className="bg-red-50 border border-red-250/60 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold text-red-700 break-words leading-relaxed">{errorBanner}</div>
              </div>
            )}

            {/* Directory Content List */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3.5 text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-xs font-semibold select-none">Syncing with GitHub repository...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center py-20 select-none">
                <div className="w-20 h-20 bg-slate-100/80 rounded-3xl flex items-center justify-center text-slate-350 hover:scale-105 transition-transform mb-4">
                  <FolderOpen className="w-10 h-10 text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">This folder is empty</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs text-center leading-normal">
                  {isConfigured
                    ? "Drag any file here or use the Sidebar buttons to upload files or create folders instantly."
                    : "Connect your GitHub private repository above to load files."}
                </p>
              </div>
            ) : layoutMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredFiles.map((file) => (
                  <FileCard
                    key={file.sha}
                    item={file}
                    onClick={() => {
                      if (file.type === "dir") {
                        setCurrentPath(file.path);
                      } else {
                        setActivePreviewItem(file);
                      }
                    }}
                    onRename={() => handleRename(file)}
                    onDelete={() => handleDelete(file)}
                    onHistory={() => setActiveHistoryItem(file)}
                    onShare={() => handleShareLink(file)}
                    onDownload={() => handleDownload(file)}
                    justCopied={copiedFileId === file.sha}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs w-full max-w-full">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200 select-none">
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="px-4 py-2.5 font-semibold">Name</th>
                      <th className="px-4 py-2.5 font-semibold text-center">Preview</th>
                      <th className="px-4 py-2.5 font-semibold hidden md:table-cell">Type</th>
                      <th className="px-4 py-2.5 font-semibold hidden sm:table-cell">Last Modified</th>
                      <th className="px-4 py-2.5 font-semibold col-span-1">Size</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredFiles.map((file) => {
                      const isDir = file.type === "dir";
                      return (
                        <tr
                          key={file.sha}
                          onClick={() => {
                            if (isDir) {
                              setCurrentPath(file.path);
                            } else {
                              setActivePreviewItem(file);
                            }
                          }}
                          className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                        >
                          <td className="px-4 py-2 flex items-center gap-3">
                            <div className="w-7 h-7 bg-slate-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                              <div className="scale-65">
                                {getFileIcon(file.name, file.type)}
                              </div>
                            </div>
                            <span className="font-semibold text-sm text-slate-800 hover:text-blue-600 transition-colors truncate max-w-[130px] sm:max-w-xs md:max-w-md">
                              {file.name}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            {!isDir ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIframeTabPreview(file);
                                }}
                                title="Open Workspace Frame Preview"
                                className="p-1.5 hover:bg-blue-50 text-blue-500 hover:text-blue-600 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-slate-300 text-xs select-none">—</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 hidden md:table-cell select-none">
                            {isDir ? "Folder" : getFileTypeLabel(file.name, file.type)}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 hidden sm:table-cell select-none font-medium italic">
                            {formatDate(file.lastModified)}
                          </td>
                          <td className="px-4 py-2 text-xs text-slate-500 font-medium font-mono select-none">
                            {isDir ? "—" : formatBytes(file.size)}
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div
                              className="flex items-center justify-end gap-1 opacity-75 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleRename(file)}
                                title="Rename File"
                                className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {!isDir && (
                                <button
                                  onClick={() => setActiveHistoryItem(file)}
                                  title="Git Version History"
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                                >
                                  <History className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isDir && (
                                <button
                                  onClick={() => handleShareLink(file)}
                                  title="Share Public Link"
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-700 transition-all cursor-pointer"
                                >
                                  {copiedFileId === file.sha ? (
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 font-semibold" />
                                  ) : (
                                    <Share2 className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              )}

                              {!isDir && (
                                <button
                                  onClick={() => handleDownload(file)}
                                  title="Download File"
                                  className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-705 transition-all cursor-pointer"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(file)}
                                title="Delete Item"
                                className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </main>
        </div>
        {/* Close Main Flex Column */}
      </div>

      {/* 4. Overlay & Configuration Drawers */}
      <GithubCredentialsModal
        isOpen={isCredentialsOpen}
        onClose={() => setIsCredentialsOpen(false)}
        savedCredentials={savedCredentials}
        onSave={(creds) => {
          localStorage.setItem("github_storage_creds", JSON.stringify(creds));
          setSavedCredentials(creds);
        }}
        onClear={() => {
          localStorage.removeItem("github_storage_creds");
          setSavedCredentials(null);
        }}
        hasEnvConfig={!!configStatus?.hasEnvConfig}
      />

      {/* Folder Creation Modal */}
      {isCreateFolderOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <FolderPlus className="w-4.5 h-4.5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">New Folder Name</h4>
              </div>
              <button
                onClick={() => setIsCreateFolderOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="p-5 space-y-4">
              <input
                type="text"
                placeholder="Enter folder name..."
                required
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-700"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderOpen(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 font-bold text-white rounded-lg transition-colors cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      <FilePreviewModal
        isOpen={activePreviewItem !== null}
        onClose={() => setActivePreviewItem(null)}
        item={activePreviewItem}
        headers={getHeaders()}
      />

      {/* Version Control Drawer */}
      <VersionHistoryDrawer
        isOpen={activeHistoryItem !== null}
        onClose={() => setActiveHistoryItem(null)}
        item={activeHistoryItem}
        headers={getHeaders()}
        onRestore={handleRestoreVersion}
      />
    </div>
  );
}