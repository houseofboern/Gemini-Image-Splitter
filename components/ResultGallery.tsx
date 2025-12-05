import React from "react";
import { GenerationResult, ModelTier } from "../types";
import { downloadImage, downloadAllImages } from "../utils/imageUtils";
import { Download, Maximize2, Scissors, Quote, Layers, Sparkles, MonitorUp } from "lucide-react";

interface ResultGalleryProps {
  results: GenerationResult[];
}

export const ResultGallery: React.FC<ResultGalleryProps> = ({ results }) => {
  if (results.length === 0) return null;

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      <style>{`
        @keyframes subtle-pop {
          0% { transform: scale(0.98); opacity: 0.5; }
          60% { transform: scale(1.01); opacity: 1; }
          100% { transform: scale(1); }
        }
        .new-result-flash {
          animation: subtle-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          box-shadow: 0 0 40px -10px rgba(99, 102, 241, 0.3);
        }
      `}</style>
      
      {results.map((result, index) => {
        const isNewest = index === 0;
        const isPro = result.model === ModelTier.PRO;
        
        return (
          <div
            key={result.timestamp}
            className={`bg-slate-800/50 border rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${
              isNewest 
                ? "border-indigo-500/50 new-result-flash" 
                : "border-slate-700"
            }`}
          >
            {/* Result Header */}
            <div className="bg-slate-900/50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                 <h3 className="text-white font-semibold flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded border ${isPro ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"}`}>
                    {isPro ? "Gemini Pro" : "Gemini Flash"}
                  </span>
                  <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded border border-emerald-500/30">
                    {result.grid.label}
                  </span>
                  {/* Resolution Indicator */}
                  {isPro && (
                    <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded border border-blue-500/30 hidden sm:flex items-center gap-1">
                      <MonitorUp size={10} /> 4K HQ
                    </span>
                  )}
                </h3>
                {isNewest && (
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-fuchsia-300 bg-fuchsia-500/20 px-2 py-0.5 rounded-full border border-fuchsia-500/30 animate-pulse">
                        <Sparkles size={10} /> Just Created
                    </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                  <button
                      onClick={() => downloadAllImages(result.splitImages, `batch-${result.timestamp}`)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm"
                  >
                      <Layers size={14} /> Download All Assets
                  </button>
                  <div className="text-xs text-slate-500 font-mono hidden sm:block">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Source Image */}
              <div className="lg:col-span-1 space-y-3">
                <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                   <span className="flex items-center gap-2"><Maximize2 size={16}/> Source Output</span>
                   <button 
                     onClick={() => downloadImage(result.originalImage, `source-${result.timestamp}.png`)}
                     className="text-indigo-400 hover:text-indigo-300 hover:underline text-xs flex items-center gap-1"
                   >
                     <Download size={14}/> Download
                   </button>
                </div>
                <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-black/50 aspect-square">
                  <img
                    src={result.originalImage}
                    alt="Original Source"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Split Results */}
              <div className="lg:col-span-2 space-y-3">
                 <div className="flex justify-between items-center text-sm font-medium text-slate-300">
                   <span className="flex items-center gap-2"><Scissors size={16}/> Split Assets ({result.splitImages.length})</span>
                   <span className="text-xs text-slate-500">Auto-cropped from source</span>
                </div>
                
                <div 
                  className="grid gap-4"
                  style={{
                      // Dynamic grid based on the number of split images to look nice
                      gridTemplateColumns: `repeat(${result.splitImages.length > 1 ? '2' : '1'}, 1fr)`
                  }}
                >
                  {result.splitImages.map((imgSrc, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="relative group rounded-xl overflow-hidden border border-slate-700 bg-black/50 aspect-square shadow-sm">
                        <img
                          src={imgSrc}
                          alt={`Split ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                            <button
                                onClick={() => downloadImage(imgSrc, `split-${result.timestamp}-${idx}.png`)}
                                className="bg-white text-slate-900 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition-colors"
                            >
                                <Download size={16} /> Save
                            </button>
                        </div>
                        <div className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-0.5 rounded">
                            #{idx + 1}
                        </div>
                      </div>
                      {/* Individual Prompt Display */}
                      <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800 text-xs text-slate-400 flex gap-2">
                          <Quote size={12} className="text-slate-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2" title={result.prompts[idx]}>
                              {result.prompts[idx] || "No prompt"}
                          </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};