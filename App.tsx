import React, { useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { ResultGallery } from "./components/ResultGallery";
import { FIXED_GRID } from "./constants";
import { GenerationResult, GridConfig, ModelTier } from "./types";
import { generateGeminiImage, generatePromptVariations } from "./services/geminiService";
import { splitImageGrid } from "./utils/imageUtils";
import { Layers, Trash2 } from "lucide-react";

const App: React.FC = () => {
  // We keep an array of 4 prompts (fixed for 2x2)
  const [prompts, setPrompts] = useState<string[]>(["", "", "", ""]);
  // New state for uploaded reference image
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  
  const [selectedModel, setSelectedModel] = useState<ModelTier>(ModelTier.FLASH);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoPrompting, setIsAutoPrompting] = useState(false);
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Updated to accept overrides so we can chain actions before state updates settle
  const handleGenerate = async (
    promptsOverride?: string[], 
    imageOverride?: string | null
  ) => {
    setIsGenerating(true);
    setError(null);

    // Hardcoded Fixed Configs
    const effectiveGrid = FIXED_GRID;
    const effectiveAspectRatio = "1:1";

    // Resolve effective values (use overrides if present, otherwise state)
    const effectivePrompts = promptsOverride || prompts;
    const effectiveImage = imageOverride !== undefined ? imageOverride : uploadedImage;

    try {
      // 1. Generate the master image
      // We only pass the prompts that are relevant to the current grid size (always 4)
      const activePromptCount = effectiveGrid.rows * effectiveGrid.cols;
      const activePrompts = effectivePrompts.slice(0, activePromptCount);

      const originalImage = await generateGeminiImage({
        prompts: activePrompts,
        referenceImage: effectiveImage,
        model: selectedModel,
        grid: effectiveGrid,
        aspectRatio: effectiveAspectRatio,
      });

      // 2. Split the image if it's a grid
      let splitImages: string[] = [];
      if (effectiveGrid.rows > 1 || effectiveGrid.cols > 1) {
        splitImages = await splitImageGrid(
          originalImage,
          effectiveGrid.rows,
          effectiveGrid.cols
        );
      } else {
        splitImages = [originalImage];
      }

      // 3. Update State
      const newResult: GenerationResult = {
        originalImage,
        splitImages,
        prompts: activePrompts,
        model: selectedModel,
        grid: effectiveGrid,
        timestamp: Date.now(),
      };

      setResults((prev) => [newResult, ...prev]);
    } catch (err: any) {
      console.error(err);
      const msg = typeof err === 'string' ? err : (err.message || "An unexpected error occurred.");
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAutoPrompt = async (imgOverride?: string) => {
    // If triggered from drop, the state might not be updated yet, so we use imgOverride
    const targetImage = typeof imgOverride === 'string' ? imgOverride : uploadedImage;

    if (!targetImage) return;
    setIsAutoPrompting(true);
    setError(null);

    try {
        const variations = await generatePromptVariations(targetImage);
        
        // Update state for UI visibility
        setPrompts(variations);
        
        // Finish the prompting phase
        setIsAutoPrompting(false);

        // CHAIN GENERATION IMMEDIATELY
        await handleGenerate(variations, targetImage);

    } catch (err: any) {
        console.error(err);
        const msg = typeof err === 'string' ? err : (err.message || "Failed to auto-generate prompts.");
        setError(msg);
        setIsAutoPrompting(false);
    }
  };

  const handleClearResults = () => {
      setResults([]);
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 text-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navbar / Header */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Layers className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Gemini GridSplitter
              </h1>
              <p className="text-xs text-indigo-400 font-mono">
                COST EFFICIENCY ENGINE
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
             <div className="text-sm font-medium text-slate-400">Powered by Google GenAI</div>
          </div>
        </header>

        <main className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Column: Controls */}
          <div className="xl:col-span-5 space-y-6">
            <ControlPanel
              prompts={prompts}
              onPromptChange={handlePromptChange}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              uploadedImage={uploadedImage}
              onImageUpload={setUploadedImage}
              isGenerating={isGenerating}
              onGenerate={() => handleGenerate()}
              onAutoPrompt={handleAutoPrompt}
              isAutoPrompting={isAutoPrompting}
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm animate-pulse">
                <strong>Error:</strong> {error}
              </div>
            )}
            
            {/* Informational Box */}
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl text-xs text-slate-500 leading-relaxed">
              <p className="mb-2 font-semibold text-slate-400">Pro Tip:</p>
              Use the <strong>Flash</strong> model for rapid idea iteration. 
              Switch to <strong>Pro</strong> (Gemini 3.0) for 4K production assets. 
              The Splitter automatically crops the 2x2 grid into individual files.
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="xl:col-span-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Generated Assets</h2>
              <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">
                    {results.length} session result{results.length !== 1 && 's'}
                  </span>
                  {results.length > 0 && (
                      <button 
                        onClick={handleClearResults}
                        className="text-slate-400 hover:text-red-400 transition-colors p-2 hover:bg-red-500/10 rounded-lg flex items-center gap-2 text-xs font-medium"
                      >
                          <Trash2 size={14} /> Clear All
                      </button>
                  )}
              </div>
            </div>
            
            {results.length === 0 ? (
              <div className="h-[500px] border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-600 gap-4 bg-slate-900/20">
                <Layers size={48} className="opacity-20" />
                <p>Configure and generate to see results here.</p>
              </div>
            ) : (
              <ResultGallery results={results} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;