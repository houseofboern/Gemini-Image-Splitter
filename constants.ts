import { GridConfig, ModelTier } from "./types";

export const FIXED_GRID: GridConfig = { 
  rows: 2, 
  cols: 2, 
  label: "2x2 (Standard)" 
};

export const MODEL_DETAILS = {
  [ModelTier.FLASH]: {
    name: "Gemini 2.5 Flash Image",
    description: "Fast, efficient. Great for iterating.",
    costIndicator: "$",
    requiresPaidKey: false,
  },
  [ModelTier.PRO]: {
    name: "Gemini 3.0 Pro Image",
    description: "High fidelity, better text adherence. Supports 4K.",
    costIndicator: "$$$",
    requiresPaidKey: true,
  }
};