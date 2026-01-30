// Conditional import for server-side only - CACHED for performance
let sharp: any = null;
let sharpInitialized = false;

// Only import sharp on server-side (singleton pattern)
function getSharp() {
  if (!sharpInitialized && typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sharp = require('sharp');
      // 🎯 PERFORMANCE: Configure sharp defaults for speed
      if (sharp) {
        sharp.cache({ memory: 50, files: 20, items: 100 }); // Limit cache to save memory
        sharp.concurrency(2); // Limit threads to avoid overloading VPS
      }
      sharpInitialized = true;
    } catch (error) {
      console.warn('Sharp not available, using fallback image processing');
      sharpInitialized = true;
    }
  }
  return sharp;
}

// 🎯 PERFORMANCE: Reduced from 500px to 400px for smaller files
const MAX_IMAGE_SIZE = 400; // Maximum dimension in pixels
const JPEG_QUALITY = 70;   // JPEG compression quality (0-100)

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Compress and optimize image for PDF embedding
 * @param imageBuffer Original image buffer
 * @returns Optimized image buffer (always PNG format for maximum compatibility)
 * 
 * 🎯 EMERGENCY FIX: Returns PNG format to completely bypass JPEG compression issues
 * PNG has no compression method conflicts with pdf-lib
 */
export async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  const sharpInstance = getSharp();
  
  // Return original buffer if not on server or sharp not available
  if (typeof window !== 'undefined' || !sharpInstance) {
    console.warn('⚠️ Using original image buffer (client-side or sharp not available)');
    console.warn('⚠️ WARNING: This may cause compression errors');
    return imageBuffer;
  }

  try {
    // Get image info
    const metadata = await sharpInstance(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not get image dimensions');
    }

    // Calculate new dimensions
    const newDimensions = calculateDimensions({
      width: metadata.width,
      height: metadata.height
    });

    // Process image - using cached sharp instance for performance
    const optimizedBuffer = await sharpInstance(imageBuffer)
      // Resize while maintaining aspect ratio
      .resize(newDimensions.width, newDimensions.height, {
        fit: 'contain',
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
        fastShrinkOnLoad: true // 🎯 PERFORMANCE: Use fast shrink-on-load
      })
      // 🎯 PERFORMANCE: Optimized PNG settings for speed
      .png({ 
        compressionLevel: 4, // Reduced from 6 for faster processing
        adaptiveFiltering: false, // Disabled for speed
        palette: false
      })
      .toBuffer();
    
    console.log(`✅ Image optimized: ${imageBuffer.length} → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)}% reduction)`);
    return optimizedBuffer;

  } catch (error) {
    console.warn('⚠️ Image optimization with resize failed, trying basic PNG conversion:', error);
    
    // 🎯 CRITICAL FALLBACK: Try basic PNG conversion without resizing
    try {
      const basicPng = await sharpInstance(imageBuffer)
        .png({ 
          compressionLevel: 4, // Reduced for speed
          adaptiveFiltering: false // Disabled for speed
        })
        .toBuffer();
      
      console.log(`✅ Fallback PNG conversion successful: ${imageBuffer.length} → ${basicPng.length} bytes`);
      return basicPng;
    } catch (fallbackError) {
      console.error('❌ All optimization methods failed, returning original buffer:', fallbackError);
      console.error('❌ WARNING: Original buffer may cause embedding errors');
      return imageBuffer; // Last resort: return original
    }
  }
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(original: ImageDimensions): ImageDimensions {
  const { width, height } = original;

  if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
    return original;
  }

  if (width > height) {
    return {
      width: MAX_IMAGE_SIZE,
      height: Math.round(height * MAX_IMAGE_SIZE / width)
    };
  } else {
    return {
      width: Math.round(width * MAX_IMAGE_SIZE / height),
      height: MAX_IMAGE_SIZE
    };
  }
}
