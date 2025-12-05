/**
 * Splits a single base64 image into a grid of smaller images.
 */
export const splitImageGrid = (
  base64Image: string,
  rows: number,
  cols: number
): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    // Safety timeout to prevent silent hanging
    const timeoutId = setTimeout(() => {
      reject(new Error("Image processing timed out (10s). The image might be too large or corrupted."));
    }, 10000);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timeoutId);
      const splitImages: string[] = [];
      const segmentWidth = img.width / cols;
      const segmentHeight = img.height / rows;

      // SAFETY CROP CONFIGURATION
      // Models sometimes generate thin white borders or gutters between grid cells.
      // We crop a small safety margin from the edges of each cell to ensure a clean result.
      // 8 pixels is approx 0.8% of a 1024px cell (Pro mode), enough to hide borders.
      const SAFETY_CROP_PX = 8; 

      // Iterate through the grid
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const canvas = document.createElement("canvas");
          canvas.width = segmentWidth;
          canvas.height = segmentHeight;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          // Calculate Crop Coordinates
          // We take the source rectangle but shrink it by SAFETY_CROP_PX on all sides
          const srcX = (c * segmentWidth) + SAFETY_CROP_PX;
          const srcY = (r * segmentHeight) + SAFETY_CROP_PX;
          const srcW = segmentWidth - (SAFETY_CROP_PX * 2);
          const srcH = segmentHeight - (SAFETY_CROP_PX * 2);

          // Draw the cropped segment into the full destination canvas (slight upscale)
          ctx.drawImage(
            img,
            srcX, 
            srcY, 
            srcW, 
            srcH, 
            0, // Dest X (0,0 ensures we fill the output)
            0, // Dest Y
            segmentWidth, // Dest Width (Original size to maintain resolution)
            segmentHeight // Dest Height
          );

          splitImages.push(canvas.toDataURL("image/png"));
        }
      }
      resolve(splitImages);
    };
    img.onerror = (err) => {
        clearTimeout(timeoutId);
        reject(err);
    };
    img.src = base64Image; // Accepts data URI
  });
};

/**
 * Downloads a base64 image
 */
export const downloadImage = (base64: string, filename: string) => {
  const link = document.createElement("a");
  link.href = base64;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Downloads multiple images sequentially with a slight delay
 */
export const downloadAllImages = async (images: string[], prefix: string) => {
    for (let i = 0; i < images.length; i++) {
        downloadImage(images[i], `${prefix}-${i + 1}.png`);
        // Small delay to prevent browser from blocking multiple popups/downloads
        await new Promise(resolve => setTimeout(resolve, 300));
    }
};