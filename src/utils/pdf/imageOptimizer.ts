import sharp from 'sharp';

const MAX_IMAGE_SIZE = 500; // Maximum dimension in pixels
const JPEG_QUALITY = 70;   // JPEG compression quality (0-100)

interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Compress and optimize image for PDF embedding
 * @param imageBuffer Original image buffer
 * @returns Optimized image buffer
 */
export async function optimizeImage(imageBuffer: Buffer): Promise<Buffer> {
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
    return await sharp(imageBuffer)
      // Resize while maintaining aspect ratio
      .resize(newDimensions.width, newDimensions.height, {
        fit: 'inside',
        withoutEnlargement: true
      })
      // Convert to JPEG with compression
      .jpeg({ 
        quality: JPEG_QUALITY,
        mozjpeg: true, // Use mozjpeg for better compression
        chromaSubsampling: '4:2:0' // Further reduce file size
      })
      // Optimize for web/pdf
      .toBuffer();

  } catch (error) {
    console.warn('Image optimization failed:', error);
    return imageBuffer; // Return original if optimization fails
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
