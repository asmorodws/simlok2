// Conditional import for server-side only
import type { ImageDimensions } from '@/types';

let sharp: any = null;

// Only import sharp on server-side
if (typeof window === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sharp = require('sharp');
  } catch (error) {
    console.warn('Sharp not available, using fallback image processing');
  }
}

const MAX_IMAGE_SIZE = 500; // Maximum dimension in pixels
const JPEG_QUALITY = 70;   // JPEG compression quality (0-100)

/**
 * Compress and optimize image for PDF embedding
 * @param imageBuffer Original image buffer
 * @returns Optimized image buffer (always JPEG format if sharp is available)
 * 
 * 🎯 CRITICAL FIX: Always returns JPEG format to prevent compression method errors
 * If optimization fails, falls back to basic JPEG conversion without resizing
 */
export async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
  // Return original buffer if not on server or sharp not available
  if (typeof window !== 'undefined' || !sharp) {
    console.warn('⚠️ Using original image buffer (client-side or sharp not available)');
    console.warn('⚠️ WARNING: This may cause "Unknown compression method" errors if buffer is PNG');
    return imageBuffer;
  }

  try {
    // Get image info
    const metadata = await sharp(imageBuffer).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error('Could not get image dimensions');
    }

    // Calculate new dimensions
    const newDimensions = calculateDimensions({
      width: metadata.width,
      height: metadata.height
    });

    // Process image
    const optimizedBuffer = await sharp(imageBuffer)
      // Resize while maintaining aspect ratio
      .resize(newDimensions.width, newDimensions.height, {
        fit: 'contain', // 🎯 FIX: Use 'contain' to preserve aspect ratio properly
        withoutEnlargement: true,
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for transparency
      })
      // Convert to JPEG with compression
      .jpeg({ 
        quality: JPEG_QUALITY,
        mozjpeg: true, // Use mozjpeg for better compression
        chromaSubsampling: '4:2:0' // Further reduce file size
      })
      // Optimize for web/pdf
      .toBuffer();
    
    console.log(`✅ Image optimized: ${imageBuffer.length} → ${optimizedBuffer.length} bytes (${Math.round((1 - optimizedBuffer.length / imageBuffer.length) * 100)}% reduction)`);
    return optimizedBuffer;

  } catch (error) {
    console.warn('⚠️ Image optimization with resize failed, trying basic JPEG conversion:', error);
    
    // 🎯 CRITICAL FALLBACK: Try basic JPEG conversion without resizing
    try {
      const basicJpeg = await sharp(imageBuffer)
        .jpeg({ 
          quality: 85, // Higher quality for fallback
          mozjpeg: false, // Disable mozjpeg for compatibility
          progressive: false
        })
        .toBuffer();
      
      console.log(`✅ Fallback JPEG conversion successful: ${imageBuffer.length} → ${basicJpeg.length} bytes`);
      return basicJpeg;
    } catch (fallbackError) {
      console.error('❌ All optimization methods failed, returning original buffer:', fallbackError);
      console.error('❌ WARNING: Original buffer may cause embedding errors if not JPEG format');
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
