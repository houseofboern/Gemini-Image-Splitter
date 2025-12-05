import React, { useRef, useState } from "react";
import { MODEL_DETAILS } from "../constants";
import { ModelTier } from "../types";
import { Loader2, Zap, Diamond, Grid as GridIcon, ImagePlus, X, Upload, Sparkles } from "lucide-react";

interface ControlPanelProps {
  prompts: string[];
  onPromptChange: (index: number, val: string) => void;
  selectedModel: ModelTier;
  setSelectedModel: (val: ModelTier) => void;
  uploadedImage: string | null;
  onImageUpload: (base64: string | null) => void;
  isGenerating: boolean;
  onGenerate: () => void;
  onAutoPrompt: (imgOverride?: string) => void;
  isAutoPrompting: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  prompts,
  onPromptChange,
  selectedModel,
  setSelectedModel,
  uploadedImage,
  onImageUpload,
  isGenerating,
  onGenerate,
  onAutoPrompt,
  isAutoPrompting,
}) => {
  // Fixed 2x2 grid
  const totalCells = 4;
  const isAllPromptsEmpty = prompts.slice(0, totalCells).every(p => !p.trim());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = (file: File, triggerAutoPrompt: boolean = false) => {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            onImageUpload(base64);
            // Reset input so same file can be selected again if cleared
            if (fileInputRef.current) fileInputRef.current.value = "";
            
            if (triggerAutoPrompt) {
                onAutoPrompt(base64);
            }
        };
        reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        processFile(file, false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
        processFile(file, true);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GridIcon className="w-6 h-6 text-indigo-400" />
          Configuration
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          Generating 2x2 Asset Grid (1:1 Aspect Ratio)
        </p>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(Object.entries(MODEL_DETAILS) as [ModelTier, typeof MODEL_DETAILS[ModelTier]][]).map(
          ([key, details]) => (
            <button
              key={key}
              onClick={() => setSelectedModel(key)}
              className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                selectedModel === key
                  ? "border-indigo-500 bg-indigo-500/10"
                  : "border-slate-700 hover:border-slate-600 bg-slate-800"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span
                  className={`flex items-center gap-2 font-semibold ${
                    selectedModel === key ? "text-indigo-300" : "text-slate-200"
                  }`}
                >
                  {key === ModelTier.FLASH ? (
                    <Zap size={16} className="text-yellow-400" />
                  ) : (
                    <Diamond size={16} className="text-cyan-400" />
                  )}
                  {details.name}
                </span>
                <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded text-slate-400">
                  {details.costIndicator}
                </span>
              </div>
              <p className="text-xs text-slate-400">{details.description}</p>
            </button>
          )
        )}
      </div>

      {/* Image Reference Upload */}
      <div 
          className="space-y-3"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
      >
        <label className="text-sm font-medium text-slate-300 flex justify-between">
           <span>Reference Image (Optional)</span>
           <span className="text-xs text-slate-500 font-normal">Use as context for generation</span>
        </label>
        
        {!uploadedImage ? (
            <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all group ${
                    isDragging 
                        ? "border-indigo-400 bg-indigo-500/20 scale-[1.02]" 
                        : "border-slate-700 hover:border-indigo-500 hover:bg-slate-800/50"
                }`}
            >
                <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                />
                <div className={`bg-slate-900 p-3 rounded-full mb-2 transition-transform ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`}>
                    <ImagePlus className={isDragging ? "text-white" : "text-indigo-400"} size={24} />
                </div>
                <span className={`text-sm font-medium ${isDragging ? "text-indigo-200" : "text-slate-400 group-hover:text-indigo-300"}`}>
                    {isDragging ? "Drop image here" : "Click or Drag & Drop to upload"}
                </span>
                <span className="text-xs text-slate-600 mt-1">Supports JPG, PNG, WEBP</span>
            </div>
        ) : (
            <div className="space-y-3">
                <div className="relative rounded-xl overflow-hidden border border-slate-600 group">
                    <img src={uploadedImage} alt="Reference" className="w-full h-48 object-cover opacity-80" />
                    
                    {/* Drag Overlay */}
                    {isDragging && (
                        <div className="absolute inset-0 bg-indigo-600/60 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-200">
                             <div className="bg-white/10 p-4 rounded-full mb-2">
                                <Sparkles className="text-white" size={32} />
                             </div>
                             <p className="absolute bottom-12 text-white font-bold text-shadow-sm">Drop for Magic Auto-Generate</p>
                        </div>
                    )}

                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={() => onImageUpload(null)}
                            className="bg-red-500/80 hover:bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 backdrop-blur-sm"
                        >
                            <X size={16} /> Remove Image
                        </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                        <Upload size={10} /> Reference Loaded
                    </div>
                </div>

                <button
                    onClick={() => onAutoPrompt()}
                    disabled={isAutoPrompting || isGenerating}
                    className={`w-full py-3 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                        isAutoPrompting || isGenerating
                        ? "bg-slate-700 text-slate-400 cursor-wait" 
                        : "bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 text-fuchsia-200 hover:from-violet-600/30 hover:to-fuchsia-600/30 border border-fuchsia-500/30 hover:border-fuchsia-400/50"
                    }`}
                >
                    {isAutoPrompting ? (
                        <><Loader2 size={16} className="animate-spin"/> Analyzing...</>
                    ) : isGenerating ? (
                        <><Loader2 size={16} className="animate-spin"/> Generating Assets...</>
                    ) : (
                        <><Sparkles size={16} /> Magic Auto-Generate</>
                    )}
                </button>
            </div>
        )}
      </div>

      {/* Prompt Inputs - Fixed 2x2 Grid */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300">Prompts (2x2 Grid)</label>
        
        <div 
            className="grid gap-3"
            style={{
                gridTemplateColumns: `repeat(2, 1fr)`,
                gridTemplateRows: `repeat(2, 1fr)`
            }}
        >
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="relative group">
                    <div className="absolute top-2 left-2 text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded border border-slate-700 pointer-events-none">
                        #{i + 1}
                    </div>
                    <textarea
                        value={prompts[i] || ""}
                        onChange={(e) => onPromptChange(i, e.target.value)}
                        placeholder={`Prompt for image ${i + 1}...`}
                        className="w-full h-full min-h-[100px] bg-slate-900 border border-slate-700 rounded-xl p-3 pt-8 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-sm transition-all hover:bg-slate-800/80"
                    />
                </div>
            ))}
        </div>
      </div>

      {/* Action Button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || (isAllPromptsEmpty && !uploadedImage)}
        className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all ${
          isGenerating || (isAllPromptsEmpty && !uploadedImage)
            ? "bg-slate-700 cursor-not-allowed text-slate-400"
            : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 hover:scale-[1.02]"
        }`}
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin" /> Generating...
          </>
        ) : (
          <>Generate 4 Assets</>
        )}
      </button>
    </div>
  );
};