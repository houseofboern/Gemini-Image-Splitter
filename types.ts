export enum ModelTier {
  FLASH = 'gemini-2.5-flash-image',
  PRO = 'gemini-3-pro-image-preview',
}

export interface GridConfig {
  rows: number;
  cols: number;
  label: string;
}

export interface GenerationResult {
  originalImage: string; // Base64
  splitImages: string[]; // Array of Base64
  prompts: string[]; // Array of strings used for each segment
  model: ModelTier;
  timestamp: number;
  grid: GridConfig;
}

export interface ImageGenerationParams {
  prompts: string[];
  referenceImage?: string | null; // Base64 string of uploaded image
  model: ModelTier;
  grid: GridConfig;
  aspectRatio: string;
}