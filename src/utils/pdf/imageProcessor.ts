import { type PDFDocument, type PDFImage } from "pdf-lib";
import sharp from 'sharp';

const MAX_IMAGE_SIZE = 500; // Maximum dimension in pixels
const MAX_CACHE_SIZE = 20; // Maximum number of images to keep in cache

// Cache for processed images
const imageCache = new Map<string, PDFImage>();

/**
 * Compresses and processes image data for PDF embedding
 */
export async function processImage(inputData: Buffer): Promise<Buffer> {
  try {
    // Server-side compression using Sharp
    return await sharp(inputData)
      .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 70 })
      .toBuffer();
  } catch (error) {
    console.warn('Image compression failed:', error);
    return inputData; // Return original if compression fails
  }
}

/**
 * Cleans up the image cache if it exceeds the maximum size
 */
function cleanupCache() {
  if (imageCache.size > MAX_CACHE_SIZE) {
    const keysToDelete = Array.from(imageCache.keys())
      .slice(0, imageCache.size - MAX_CACHE_SIZE);
    keysToDelete.forEach(key => imageCache.delete(key));
  }
}

/**
 * Load and embed photo from file path or base64
 */
export async function loadWorkerPhoto(pdfDoc: PDFDocument, photoPath?: string | null): Promise<PDFImage | null> {
  if (!photoPath) return null;

  // Check cache first
  if (imageCache.has(photoPath)) {
    return imageCache.get(photoPath)!;
  }

  try {
    let imageBuffer: Buffer | null = null;

    if (photoPath.startsWith('data:image/') || photoPath.startsWith('data:') || photoPath.match(/^[A-Za-z0-9+/=]+$/)) {
      // Handle base64 data
      let base64Data: string | undefined;

      
      if (photoPath.startsWith('data:image/')) {
        const base64Parts = photoPath.split(',');
        base64Data = base64Parts[1];
      } else if (photoPath.startsWith('data:')) {
        const base64Parts = photoPath.split(',');
        base64Data = base64Parts.length > 1 ? base64Parts[1] : photoPath.replace('data:', '');
      } else {
        base64Data = photoPath;
      }
      
      if (base64Data) {
        imageBuffer = Buffer.from(base64Data, 'base64');
      }
    } else {
      // Handle file path
      const fs = await import('fs');
      const path = await import('path');
      let fullPath: string;
      
      if (photoPath.startsWith('/api/files/')) {
        const apiParts = photoPath.split('/');
        if (apiParts.length >= 5) {
          const [, , , userId, category, ...filenameParts] = apiParts;
          const filename = filenameParts.join('/');
          
          if (!userId || !category || !filename) {
            return null;
          }
          
          const categoryFolders: Record<string, string> = {
            sika: 'dokumen-sika',
            simja: 'dokumen-simja',
            id_card: 'id-card',
            other: 'lainnya',
            'worker-photo': 'foto-pekerja'
          };
          
          const folderName = categoryFolders[category] || category;
          fullPath = path.join(process.cwd(), 'public', 'uploads', userId, folderName, filename);
        } else {
          return null;
        }
      } else {
        fullPath = path.join(process.cwd(), 'public', 
          photoPath.startsWith('/') ? photoPath : `/uploads/${photoPath}`);
      }
      
      if (fs.existsSync(fullPath)) {
        imageBuffer = fs.readFileSync(fullPath);
      }
    }

    if (imageBuffer) {
      // Process and compress image
      const processedBuffer = await processImage(imageBuffer);
      const isPng = photoPath.toLowerCase().includes('.png');
      
      // Embed processed image
      const resultImage = isPng 
        ? await pdfDoc.embedPng(processedBuffer)
        : await pdfDoc.embedJpg(processedBuffer);

      // Cache the result
      imageCache.set(photoPath, resultImage);
      cleanupCache();

      return resultImage;
    }

    return null;
  } catch (error) {
    console.warn('Failed to load and process image:', error);
    return null;
  }
}

/**
 * Load worker photos in batches
 */
export async function preloadWorkerPhotos(
  pdfDoc: PDFDocument, 
  workerList: Array<{ worker_name: string; worker_photo?: string | null }>
): Promise<void> {
  // Filter out cached and null photos
  const photosToLoad = workerList
    .filter(worker => worker.worker_photo && !imageCache.has(worker.worker_photo))
    .map(worker => worker.worker_photo as string);

  // Process photos in batches
  const batchSize = 3;
  for (let i = 0; i < photosToLoad.length; i += batchSize) {
    const batch = photosToLoad.slice(i, i + batchSize);
    
    // Load batch in parallel
    await Promise.allSettled(
      batch.map(photo => loadWorkerPhoto(pdfDoc, photo))
    );
    
    // Small delay between batches to allow GC
    if (i + batchSize < photosToLoad.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
}