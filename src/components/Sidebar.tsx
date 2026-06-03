import React, { useRef } from "react";
import {
  HardDrive,
  Trash2,
  FolderPlus,
  UploadCloud,
  Database,
  CloudLightning,
  AlertTriangle,
  Github,
  TrendingUp,
} from "lucide-react";
import CodeDump from "../../assets/codedump_64x64.png";

interface Props {
  view: "drive" | "trash";
  setView: (v: "drive" | "trash") => void;
  totalFiles: number;
  totalFolders: number;
  storageUsedMB: string;
  onOpenCredentials: () => void;
  isConfigured: boolean;
  onUploadSelect: (file: File) => void;
  onCreateFolderSelect: () => void;
  uploadProgress: number | null;
}

export default function Sidebar({
  view,
  setView,
  totalFiles,
  totalFolders,
  storageUsedMB,
  onOpenCredentials,
  isConfigured,
  onUploadSelect,
  onCreateFolderSelect,
  uploadProgress,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadSelect(e.target.files[0]);
    }
  };

  // Safe percentage calculation based on a custom soft account limit of 100MB for the demo, or similar
  const maxLimit = 100; // 100MB
  const numericalUsed = parseFloat(storageUsedMB) || 0;
  const progressPercent = Math.min((numericalUsed / maxLimit) * 100, 100);

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-50 to-slate-900 border-r border-blue-400/30 shadow-[4px_0_24px_rgba(0,0,0,0.05)] shrink-0 h-full flex flex-col p-4 select-none text-white">
      {/* Logo Header in Sidebar */}
      <div className="flex items-center gap-2 mb-6 px-1">
        <img src={CodeDump} alt="CodeDump Logo" width={24} height={24} />
        <span className="font-bold text-xl tracking-tight text-[#1ba4ec] drop-shadow-sm">CodeDump</span>
      </div>

      {/* Upload & Create actions */}
      <div className="space-y-3 mb-6">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          id="sidebar-file-upload"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!isConfigured || uploadProgress !== null}
          className="w-full py-2.5 px-4 text-xs font-semibold text-black/90 hover:text-black bg-black/10 hover:bg-black/20 disabled:opacity-50 border border-black/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          {uploadProgress !== null ? (
            <span className="flex items-center gap-2 animate-pulse">
              <UploadCloud className="w-4 h-4 animate-bounce" /> {uploadProgress}%
            </span>
          ) : (
            <>
              <UploadCloud className="w-4 h-4" />
              Upload Files
            </>
          )}
        </button>

        <button
          onClick={onCreateFolderSelect}
          disabled={!isConfigured}
          className="w-full py-2.5 px-4 text-xs font-semibold text-black/90 hover:text-black bg-black/10 hover:bg-black/20 disabled:opacity-50 border border-black/20 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          <FolderPlus className="w-4 h-4 text-black/80" />
          Create Folder
        </button>
      </div>

      {/* Main navigation categories */}
      <nav className="space-y-1.5 flex-1 mt-2">
        <button
          onClick={() => setView("drive")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all cursor-pointer text-left ${
            view === "drive"
              ? "bg-black/20 text-white font-bold shadow-sm border border-white/10"
              : "text-black/80 hover:bg-white/10 hover:text-white font-medium border border-transparent"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>All Files</span>
        </button>

        <button
          onClick={() => setView("trash")}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all cursor-pointer text-left ${
            view === "trash"
              ? "bg-red-500/80 text-white font-bold shadow-xs border border-red-400/30"
              : "text-white/80 hover:bg-red-500/30 hover:text-white font-medium border border-transparent"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Trash Bin</span>
        </button>
      </nav>

      {/* Connection status display */}
      <div className="mt-4 p-3.5 rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-white/70">Database Binding</span>
          <div className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full shadow-sm ${isConfigured ? "bg-emerald-400 animate-pulse drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]" : "bg-amber-400"}`}
            ></span>
            <span className="text-[10px] font-bold text-white/90">{isConfigured ? "Live Sync" : "No Config"}</span>
          </div>
        </div>

        <button
          onClick={onOpenCredentials}
          className="w-full py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
        >
          <Database className="w-3.5 h-3.5" />
          {isConfigured ? "Manage Github" : "Setup Storage"}
        </button>
      </div>

      {/* Storage and Statistics block */}
      <div className="mt-5 pt-4 border-t border-white/20">
        <div className="mb-2.5 flex justify-between text-xs font-medium">
          <span className="text-white/80">Storage Used</span>
          <span className="text-white font-bold">{storageUsedMB} MB</span>
        </div>
        <div className="w-full bg-blue-900/30 h-2 rounded-full overflow-hidden flex border border-black/10 shadow-inner">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              progressPercent > 80 ? "bg-red-400" : progressPercent > 50 ? "bg-amber-400" : "bg-blue-300 drop-shadow-[0_0_2px_rgba(147,197,253,0.5)]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-white/50 mt-2 leading-relaxed">
          Managed by GitDrive Private Repository
        </p>

        <div className="grid grid-cols-2 gap-2 mt-3 text-center">
          <div className="p-1.5 bg-white/10 border border-white/20 rounded-lg">
            <div className="text-[9px] text-white/60 font-bold uppercase tracking-wider">Folders</div>
            <div className="text-xs font-bold text-white shadow-xs">{totalFolders}</div>
          </div>
          <div className="p-1.5 bg-white/10 border border-white/20 rounded-lg">
            <div className="text-[9px] text-white/60 font-bold uppercase tracking-wider">Files</div>
            <div className="text-xs font-bold text-white shadow-xs">{totalFiles}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
