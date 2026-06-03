import React, { useEffect, useState } from "react";
import { X, Monitor, ShieldCheck, Check } from "lucide-react";

interface DesktopFramePreviewProps {
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

export default function DesktopFramePreview({ fileName, fileUrl, onClose }: DesktopFramePreviewProps) {
  const [copied, setCopied] = useState(false);

  // Convert URL to Google Viewer format so it opens on mobile Chrome instead of downloading
  const formattedIframeUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

  // Automatically copy the link when the component mounts (opens)
  useEffect(() => {
    if (fileUrl) {
      navigator.clipboard.writeText(fileUrl)
        .then(() => {
          setCopied(true);
          // Reset the "Copied" alert status after 2 seconds
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => {
          console.error("Failed to automatically copy link: ", err);
        });
    }
  }, [fileUrl]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col p-2 sm:p-4 md:p-8 animate-fade-in justify-center">
      
      {/* Mobile Floating Close Button (Hidden on Desktop) */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[110] flex md:hidden items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-white shadow-lg active:scale-95 transition-transform"
        aria-label="Close preview"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Main Container (Limits height to viewport on mobile) */}
      <div className="w-full max-w-7xl mx-auto flex flex-col h-[85vh] sm:h-[90vh] md:h-full max-h-full">
        
        {/* Simulation Browser Top Dock Frame Layout */}
        <div className="w-full bg-white rounded-t-xl md:rounded-t-2xl border-t border-x border-slate-200 shadow-2xl h-12 shrink-0 flex items-center justify-between px-3 md:px-4 select-none">
          <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1 md:flex-initial">
            {/* Mac Window Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={onClose}
                className="w-3 h-3 rounded-full bg-red-400 hover:bg-red-500 transition-colors cursor-pointer flex items-center justify-center text-[8px] text-red-900 font-bold"
                title="Close"
              >
                <span className="hidden md:inline">✕</span>
              </button>
              <span className="w-3 h-3 rounded-full bg-amber-400"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
            </div>
            
            {/* URL / File Name Bar with Auto-Copy Status Change */}
            <div 
              className={`flex items-center gap-1.5 ml-2 md:ml-4 border rounded-md px-2.5 py-1 max-w-[180px] sm:max-w-xs md:max-w-md min-w-0 transition-all duration-300 ${
                copied 
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700" 
                  : "bg-slate-50 border-slate-200/80 text-slate-600"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500 shrink-0 animate-bounce" />
                  <span className="text-xs font-bold truncate">Copied URL!</span>
                </>
              ) : (
                <>
                  <Monitor className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="text-xs font-semibold truncate">{fileName}</span>
                </>
              )}
            </div>
          </div>

          {/* Secure Tag (Hidden on Mobile to save space) */}
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px] font-medium tracking-tight ml-4 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 
            <span className="hidden md:inline">Secure Sandbox Desktop Container</span>
            <span className="inline md:hidden">Secure Sandbox</span>
          </div>
        </div>

        {/* Frame Viewer Body Viewport */}
        <div className="w-full flex-1 bg-white rounded-b-xl md:rounded-b-2xl border-b border-x border-slate-200 shadow-2xl overflow-hidden relative">
          <iframe
            src={formattedIframeUrl}
            title={`Desktop Sandbox View - ${fileName}`}
            className="w-full h-full border-none bg-white attachment-iframe"
          />
        </div>
      </div>
    </div>
  );
}