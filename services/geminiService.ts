import { GoogleGenAI } from "@google/genai";
import { ImageGenerationParams, ModelTier } from "../types";

export const generatePromptVariations = async (
  referenceImage: string
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Extract pure base64
  let cleanBase64 = referenceImage;
  let mimeType = "image/png";
  const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
  if (matches) {
    mimeType = matches[1];
    cleanBase64 = matches[2];
  }

  // Inject a random seed in the prompt text to prevent deterministic caching
  const seed = Math.floor(Math.random() * 1000000);

  const prompt = `
    [Task ID: ${seed}]
    You are a high-end portrait photographer and creative director editing a photoshoot.

    OBJECTIVE:
    Create 4 distinct prompts to generate NEW variations of the subject in the uploaded image.
    
    CRITICAL CONSTRAINT - IDENTITY PRESERVATION:
    - The user wants "EDITS" of the original subject, NOT new people.
    - First, internally analyze the subject's distinct features: Hair style/color, specific clothing details, facial structure, and background context.
    - EACH of your 4 prompts MUST start with: "The exact same subject from the reference image, wearing the same [describe clothes], ..."
    
    CREATIVE DIRECTION (Avoid Clichés):
    - Do NOT default to "winking", "blowing a kiss", or "3/4 angle" unless it is uniquely perfect for this specific image.
    - Invent 4 UNIQUE, natural scenarios that fit the current environment. 
    - Example: If they are in a cafe, maybe they are looking out the window, or checking their phone, or laughing at a joke. If they are in a car, maybe they are adjusting the mirror or putting on sunglasses.
    - Make the actions subtle and realistic for a social media carousel.

    OUTPUT FORMAT:
    Return ONLY a raw JSON array of 4 strings.
    Example: 
    [
      "The exact same subject from the reference image, wearing the red hoodie, looking down thoughtfully...", 
      "The exact same subject from the reference image, wearing the red hoodie, laughing naturally with eyes closed...",
      ...
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", 
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        temperature: 1.3, // Higher creativity to break patterns
        topP: 0.95,
      }
    });

    const text = response.text || "[]";
    // Clean up any markdown code blocks if the model adds them
    const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    let prompts;
    try {
        prompts = JSON.parse(jsonStr);
    } catch (e) {
        console.error("JSON Parse Error", text);
        // Fallback cleanup for common JSON errors
        const fixedJson = jsonStr.replace(/[\u0000-\u001F]+/g, "");
        prompts = JSON.parse(fixedJson);
    }

    if (Array.isArray(prompts) && prompts.length > 0) {
        // Ensure we always return 4, padding if necessary
        while (prompts.length < 4) {
            prompts.push(prompts[0]);
        }
        return prompts.slice(0, 4);
    }
    throw new Error("Failed to parse valid prompts from Gemini response.");

  } catch (error) {
    console.error("Auto-Prompt Error:", error);
    throw new Error("Could not auto-generate prompts. Please try again.");
  }
};

export const generateGeminiImage = async (
  params: ImageGenerationParams
): Promise<string> => {
  const { prompts, referenceImage, model, grid, aspectRatio } = params;

  // 1. Handle API Key Selection for Pro models
  if (model === ModelTier.PRO) {
    const win = window as any;
    if (win.aistudio && win.aistudio.hasSelectedApiKey) {
      const hasKey = await win.aistudio.hasSelectedApiKey();
      if (!hasKey && win.aistudio.openSelectKey) {
        await win.aistudio.openSelectKey();
      }
    }
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 2. Engineer the prompt for Grid generation
  let engineeredPrompt = "";
  const count = grid.rows * grid.cols;

  // Filter out empty prompts but keep index logic if mixed (though UI prevents mixed mostly)
  const validPrompts = prompts.filter(p => p.trim().length > 0);
  
  if (count === 1) {
    engineeredPrompt = prompts[0] || "Generate an image.";
  } else {
    // Multi-prompt construction
    engineeredPrompt = `
      TASK: Create a ${grid.rows}x${grid.cols} grid of images.
      
      CRITICAL INSTRUCTION: IDENTITY CONSISTENCY & LAYOUT
      - All images in the grid must feature the EXACT SAME CHARACTER as the provided reference image.
      - Maintain the same facial features, hairstyle, body type, and clothing details across all grid cells.
      - Treat this as an "Edit" task where the subject is constant, but the pose/expression changes.
      
      CRITICAL LAYOUT CONSTRAINT:
      - FULL BLEED: Images must touch the edges of their grid cell.
      - NO BORDERS: Do NOT add any white borders, frames, or gutters between the grid cells.
      - SEAMLESS: The grid lines should be invisible boundaries, not drawn lines.

      GRID ASSIGNMENTS:
    `.trim() + "\n";

    for (let i = 0; i < count; i++) {
        let position = "";
        if (grid.rows === 1 && grid.cols === 2) {
            position = i === 0 ? "Left" : "Right";
        } else if (grid.rows === 2 && grid.cols === 1) {
            position = i === 0 ? "Top" : "Bottom";
        } else if (grid.rows === 2 && grid.cols === 2) {
            if (i === 0) position = "Top-Left";
            if (i === 1) position = "Top-Right";
            if (i === 2) position = "Bottom-Left";
            if (i === 3) position = "Bottom-Right";
        }

        const userPrompt = prompts[i] || "Same subject, slight variation.";
        engineeredPrompt += `\n[${position} Cell]: ${userPrompt}`;
    }

    engineeredPrompt += "\n\nVerify that the subject looks identical in all cells and there are NO borders.";
  }

  // Fallback for image-only generation
  if (referenceImage && validPrompts.length === 0) {
      engineeredPrompt += "\nGenerate the content based strictly on the visual style and subject identity of the reference image.";
  }

  console.log("Engineered Prompt:", engineeredPrompt);

  // 3. Prepare Contents (Multimodal check)
  const parts: any[] = [];

  // Add reference image if present
  if (referenceImage) {
    // Relaxed regex to capture base64 more robustly
    const matches = referenceImage.match(/^data:(.+);base64,(.+)$/);
    if (matches) {
        parts.push({
            inlineData: {
                mimeType: matches[1],
                data: matches[2]
            }
        });
        engineeredPrompt = "Using the provided image as the STRICT REFERENCE for character identity:\n" + engineeredPrompt;
    } else {
        // Fallback for raw base64 strings if passed without scheme
        parts.push({
             inlineData: {
                 mimeType: "image/png",
                 data: referenceImage.replace(/^data:image\/\w+;base64,/, "")
             }
        });
    }
  }

  parts.push({ text: engineeredPrompt });

  // 4. Make the API Call
  let imageBase64 = "";

  try {
    console.log("Sending payload size:", JSON.stringify(parts).length);
    
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        role: 'user', // Explicit role
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          // Explicitly enforce 4K resolution for Pro models
          ...(model === ModelTier.PRO ? { imageSize: "4K" } : {}), 
        },
      },
    });

    // Safety check for refusal/block
    if (!response.candidates || response.candidates.length === 0) {
        throw new Error("The model returned no candidates. It may have been blocked by safety settings.");
    }

    // 5. Extract Image
    const content = response.candidates[0].content;
    if (content.parts) {
      for (const part of content.parts) {
        if (part.inlineData && part.inlineData.data) {
          imageBase64 = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
        // If the model returns text instead of an image (refusal)
        if (part.text) {
             console.warn("Model returned text instead of image:", part.text);
             throw new Error(`Model Refusal: ${part.text.substring(0, 100)}...`);
        }
      }
    }

    if (!imageBase64) {
      throw new Error("No image data found in response.");
    }

    return imageBase64;

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    // Robust error message extraction
    let msg = error.message || "Unknown error";
    if (JSON.stringify(error).includes("400")) msg = "Bad Request (400). Your image might be too large or the prompt violated safety policies.";
    if (msg.includes("Requested entity was not found") && model === ModelTier.PRO) {
       const win = window as any;
       if (win.aistudio && win.aistudio.openSelectKey) {
          await win.aistudio.openSelectKey();
          throw new Error("API Key issue detected. Please re-select your key and try again.");
       }
    }
    throw new Error(msg);
  }
};