import { PDFDocument, PDFImage } from "pdf-lib";
import { optimizeImage } from "./imageOptimizer";

const MAX_CACHE_SIZE = 20;
const MAX_BATCH_SIZE = 3;
const BATCH_DELAY = 100; // ms between batches

// LRU Cache for processed images
class ImageCache {
  private cache = new Map<string, {
    image: PDFImage;
    lastAccessed: number;
  }>();

  get(key: string): PDFImage | undefined {
    const item = this.cache.get(key);
    if (item) {
      item.lastAccessed = Date.now();
      return item.image;
    }
    return undefined;
  }

  set(key: string, image: PDFImage): void {
    // Clean old entries if needed
    if (this.cache.size >= MAX_CACHE_SIZE) {
      // Sort by last accessed time and remove oldest
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE + 1);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    this.cache.set(key, {
      image,
      lastAccessed: Date.now()
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }
}

// Singleton cache instance
const imageCache = new ImageCache();

/**
 * Load and process image from base64 string
 */
async function loadBase64Image(
  pdfDoc: PDFDocument,
  base64Data: string,
  isPng: boolean
): Promise<PDFImage | null> {
  try {
    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Optimize image
    const optimizedBuffer = await optimizeImage(imageBuffer);
    
    // Embed in PDF
    return isPng
      ? await pdfDoc.embedPng(optimizedBuffer)
      : await pdfDoc.embedJpg(optimizedBuffer);
  } catch (error) {
    console.warn('Failed to process base64 image:', error);
    return null;
  }
}

/**
 * Load and process image from filesystem
 */
async function loadFileImage(
  pdfDoc: PDFDocument,
  filePath: string,
  isPng: boolean
): Promise<PDFImage | null> {
  try {
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      console.warn('File does not exist:', filePath);
      return null;
    }

    // Read and optimize image
    const imageBuffer = fs.readFileSync(filePath);
    const optimizedBuffer = await optimizeImage(imageBuffer);

    // Embed in PDF
    return isPng
      ? await pdfDoc.embedPng(optimizedBuffer)
      : await pdfDoc.embedJpg(optimizedBuffer);
  } catch (error) {
    console.warn('Failed to process file image:', error);
    return null;
  }
}

/**
 * Load worker photo with improved error handling and caching
 */
export async function loadWorkerPhoto(
  pdfDoc: PDFDocument,
  photoPath?: string | null
): Promise<PDFImage | null> {
  if (!photoPath) return null;

  try {
    // Check cache first with validation
    const cached = imageCache.get(photoPath);
    if (cached) {
      try {
        // Validate cached image
        const imgDims = cached.scale(1);
        if (imgDims.width > 0 && imgDims.height > 0) {
          return cached;
        } else {
          console.warn('Removing invalid cached image with zero dimensions');
          imageCache.delete(photoPath);
        }
      } catch (error) {
        console.warn('Invalid cached image, removing from cache:', error);
        imageCache.delete(photoPath);
      }
    }

    let resultImage: PDFImage | null = null;
    const timestamp = Date.now();

    if (photoPath.startsWith('data:image/') || photoPath.match(/^[A-Za-z0-9+/=]+$/)) {
      // Handle base64 data
      const isPng = photoPath.includes('image/png');
      let base64Data = photoPath;

      if (photoPath.startsWith('data:')) {
        const parts = photoPath.split(',');
        base64Data = parts[parts.length - 1] || '';
      }

      resultImage = await loadBase64Image(pdfDoc, base64Data, isPng);
    } else if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      // Handle remote URLs with cache busting
      try {
        const response = await fetch(`${photoPath}?t=${timestamp}`);
        if (!response.ok) throw new Error('Failed to fetch image');
        const buffer = await response.arrayBuffer();
        const isPng = photoPath.toLowerCase().endsWith('.png');
        resultImage = isPng 
          ? await pdfDoc.embedPng(new Uint8Array(buffer))
          : await pdfDoc.embedJpg(new Uint8Array(buffer));
      } catch (error) {
        console.warn('Failed to fetch remote image:', error);
        return null;
      }
    } else {
      // Handle local file path with improved path resolution
      const path = await import('path');
      const isPng = photoPath.toLowerCase().endsWith('.png');

      // Determine final path based on input with proper error handling
      let finalPath: string;
      if (photoPath.startsWith('/api/files/')) {
        finalPath = path.join(process.cwd(), 'public', photoPath.replace('/api/files/', '/uploads/'));
      } else {
        finalPath = path.join(process.cwd(), 'public', 
          photoPath.startsWith('/') ? photoPath : `/uploads/${photoPath}`);
      }

      console.log('Loading image from:', finalPath);
      resultImage = await loadFileImage(pdfDoc, finalPath, isPng);
    }

    // Validate and cache result
    if (resultImage) {
      try {
        const imgDims = resultImage.scale(1);
        if (imgDims.width > 0 && imgDims.height > 0) {
          imageCache.set(photoPath, resultImage);
          return resultImage;
        } else {
          console.warn('Skipping invalid image with zero dimensions:', photoPath);
          return null;
        }
      } catch (error) {
        console.warn('Failed to validate image dimensions:', error);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to load worker photo:', error);
    return null;
  }
}

/**
 * Load worker photos in batches with improved error handling
 */
export async function preloadWorkerPhotos(
  pdfDoc: PDFDocument,
  workerList: Array<{ worker_photo?: string | null }>
): Promise<void> {
  // Filter out cached and null photos
  const photosToLoad = workerList
    .filter(w => w.worker_photo && !imageCache.has(w.worker_photo))
    .map(w => w.worker_photo as string);

  console.log(`Preloading ${photosToLoad.length} worker photos...`);

  // Process in small batches
  for (let i = 0; i < photosToLoad.length; i += MAX_BATCH_SIZE) {
    const batch = photosToLoad.slice(i, i + MAX_BATCH_SIZE);
    
    try {
      // Load batch in parallel with proper error handling
      await Promise.all(batch.map(async (photo) => {
        try {
          await loadWorkerPhoto(pdfDoc, photo);
        } catch (error) {
          console.warn(`Failed to preload photo: ${photo}`, error);
        }
      }));
      
      // Small delay between batches
      if (i + MAX_BATCH_SIZE < photosToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    } catch (error) {
      console.warn('Batch processing failed:', error);
      // Continue with next batch
    }
  }

  console.log('Worker photo preloading completed');
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}