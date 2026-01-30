import { PDFDocument, PDFImage } from "pdf-lib";
import { optimizeImage } from "./imageOptimizer";

// Ensure this module only runs on server-side
if (typeof window !== 'undefined') {
  throw new Error('imageLoader should only be used on server-side');
}

// 🎯 PERFORMANCE FIX: Increased batch size and reduced delays
const MAX_CACHE_SIZE = 50; // Increased from 20
const MAX_BATCH_SIZE = 10; // Increased from 3 for faster parallel loading
const BATCH_DELAY = 50; // Reduced from 100ms to 50ms
const LOAD_TIMEOUT = 5000; // 5 second timeout for image loading

// 🎯 CRITICAL FIX: Cache optimized buffers instead of PDFImage objects
// PDFImage objects are bound to specific PDFDocument instances and cannot be reused
class ImageCache {
  private cache = new Map<string, {
    buffer: Buffer; // Store optimized buffer, not PDFImage
    lastAccessed: number;
  }>();

  get(key: string): Buffer | undefined {
    const item = this.cache.get(key);
    if (item) {
      item.lastAccessed = Date.now();
      return item.buffer;
    }
    return undefined;
  }

  set(key: string, buffer: Buffer): void {
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
      buffer,
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

  get size(): number {
    return this.cache.size;
  }
}

// Singleton cache instance
const imageCache = new ImageCache();

/**
 * Load and process image from base64 string
 * 🎯 FIXED: Always embed as JPG after optimization (optimizeImage converts to JPEG)
 * 🎯 FIXED: Cache optimized buffers instead of PDFImage objects
 * 🎯 CRITICAL FIX: Handle compression errors with fallback
 */
async function loadBase64Image(
  pdfDoc: PDFDocument,
  base64Data: string
): Promise<PDFImage | null> {
  try {
    // Check cache first
    const cacheKey = `base64:${base64Data.substring(0, 50)}`; // Use first 50 chars as key
    const cachedBuffer = imageCache.get(cacheKey);
    
    let optimizedBuffer: Buffer;
    
    if (cachedBuffer) {
      console.log(`[LoadBase64Image] ✅ Using cached buffer`);
      optimizedBuffer = cachedBuffer;
    } else {
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(base64Data, 'base64');
      console.log(`[LoadBase64Image] Original image size: ${imageBuffer.length} bytes`);
      
      // Optimize image (IMPORTANT: This converts to PNG format for compatibility!)
      optimizedBuffer = await optimizeImage(imageBuffer);
      console.log(`[LoadBase64Image] Optimized image size: ${optimizedBuffer.length} bytes`);
      
      // Cache the optimized buffer
      imageCache.set(cacheKey, optimizedBuffer);
    }
    
    // 🎯 EMERGENCY FIX: Use PNG embed since optimizer returns PNG
    try {
      console.log(`[LoadBase64Image] Attempting to embed as PNG (optimized format)`);
      const result = await pdfDoc.embedPng(optimizedBuffer);
      console.log(`[LoadBase64Image] ✅ Successfully embedded PNG in PDF`);
      return result;
    } catch (embedError) {
      console.warn('[LoadBase64Image] ⚠️ PNG embed failed, trying JPEG fallback:', embedError);
      
      // Fallback: Try re-converting to JPEG if PNG fails
      try {
        const sharp = (await import('sharp')).default;
        const jpegBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 95, progressive: false, mozjpeg: false })
          .toBuffer();
        
        const resultJpg = await pdfDoc.embedJpg(jpegBuffer);
        console.log(`[LoadBase64Image] ✅ Successfully embedded as JPEG fallback`);
        return resultJpg;
      } catch (jpegError) {
        console.error('[LoadBase64Image] ❌ Both PNG and JPEG embed failed');
        throw jpegError;
      }
    }
  } catch (error) {
    console.warn('[LoadBase64Image] ❌ Failed to process base64 image:', error);
    return null;
  }
}

/**
 * Load and process image from filesystem
 * 🎯 FIXED: Always embed as JPG after optimization (optimizeImage converts to JPEG)
 * 🎯 FIXED: Return both PDFImage and optimized buffer for caching
 * 🎯 CRITICAL FIX: Handle compression errors with fallback and re-optimization
 */
async function loadFileImage(
  pdfDoc: PDFDocument,
  filePath: string
): Promise<{ image: PDFImage; buffer: Buffer } | null> {
  try {
    const fs = await import('fs');
    if (!fs.existsSync(filePath)) {
      console.warn(`[LoadFileImage] File does not exist: ${filePath}`);
      return null;
    }

    // Read and optimize image
    const imageBuffer = fs.readFileSync(filePath);
    console.log(`[LoadFileImage] Original image size: ${imageBuffer.length} bytes, path: ${filePath}`);
    
    // Optimize image (IMPORTANT: This converts to PNG format for compatibility!)
    const optimizedBuffer = await optimizeImage(imageBuffer);
    console.log(`[LoadFileImage] Optimized image size: ${optimizedBuffer.length} bytes`);

    // 🎯 EMERGENCY FIX: Use PNG embed since optimizer returns PNG
    try {
      console.log(`[LoadFileImage] Attempting to embed as PNG (optimized format)`);
      const result = await pdfDoc.embedPng(optimizedBuffer);
      console.log(`[LoadFileImage] ✅ Successfully embedded PNG in PDF`);
      return { image: result, buffer: optimizedBuffer };
    } catch (embedError) {
      console.warn(`[LoadFileImage] ⚠️ PNG embed failed, trying JPEG fallback:`, embedError);
      
      // Fallback 1: Try re-optimizing with higher quality
      try {
        const sharp = (await import('sharp')).default;
        const reOptimizedBuffer = await sharp(imageBuffer)
          .jpeg({ quality: 95, progressive: false, mozjpeg: false })
          .toBuffer();
        
        console.log(`[LoadFileImage] Re-optimized with quality 95: ${reOptimizedBuffer.length} bytes`);
        const result = await pdfDoc.embedJpg(reOptimizedBuffer);
        console.log(`[LoadFileImage] ✅ Successfully embedded re-optimized JPG`);
        return { image: result, buffer: reOptimizedBuffer };
      } catch (reOptError) {
        console.warn(`[LoadFileImage] ⚠️ Re-optimization failed, trying PNG:`, reOptError);
        
        // Fallback 2: Convert to PNG
        try {
          const sharp = (await import('sharp')).default;
          const pngBuffer = await sharp(imageBuffer)
            .png({ compressionLevel: 6 })
            .toBuffer();
          
          console.log(`[LoadFileImage] Converted to PNG: ${pngBuffer.length} bytes`);
          const resultPng = await pdfDoc.embedPng(pngBuffer);
          console.log(`[LoadFileImage] ✅ Successfully embedded as PNG fallback`);
          return { image: resultPng, buffer: pngBuffer };
        } catch (pngError) {
          console.error(`[LoadFileImage] ❌ All embedding methods failed`);
          throw pngError;
        }
      }
    }
  } catch (error) {
    console.error(`[LoadFileImage] ❌ Failed to process file image:`, error);
    return null;
  }
}

/**
 * Load worker photo with smart caching and fallback path resolution
 * 🎯 FIXED: Cache optimized buffers and re-embed for each PDFDocument
 * 🐛 DEBUG: Enhanced logging for troubleshooting missing photos
 */
export async function loadWorkerPhoto(
  pdfDoc: PDFDocument,
  photoPath?: string | null
): Promise<PDFImage | null> {
  if (!photoPath) {
    return null;
  }

  console.log(`[LoadWorkerPhoto] Starting load for: ${photoPath}`);

  try {
    // Check if we have cached optimized buffer
    const cachedBuffer = imageCache.get(photoPath);
    if (cachedBuffer) {
      console.log(`[LoadWorkerPhoto] ✅ Using cached buffer, embedding in new PDF: ${photoPath}`);
      try {
        // Re-embed cached buffer into this PDFDocument instance
        // 🎯 EMERGENCY FIX: Try PNG first (optimizer returns PNG), fallback to JPEG
        try {
          const resultImage = await pdfDoc.embedPng(cachedBuffer);
          return resultImage;
        } catch (embedError) {
          console.warn(`[LoadWorkerPhoto] ⚠️ Cached PNG embed failed, trying JPEG:`, embedError);
          const resultImage = await pdfDoc.embedJpg(cachedBuffer);
          return resultImage;
        }
      } catch (error) {
        console.warn(`[LoadWorkerPhoto] ⚠️ Failed to embed cached buffer, reloading:`, error);
        imageCache.delete(photoPath);
      }
    }

    let resultImage: PDFImage | null = null;
    let optimizedBuffer: Buffer | null = null;
    const timestamp = Date.now();

    if (photoPath.startsWith('data:image/') || photoPath.match(/^[A-Za-z0-9+/=]+$/)) {
      console.log(`[LoadWorkerPhoto] Processing base64 image`);
      // Handle base64 data
      let base64Data = photoPath;

      if (photoPath.startsWith('data:')) {
        const parts = photoPath.split(',');
        base64Data = parts[parts.length - 1] || '';
      }

      resultImage = await loadBase64Image(pdfDoc, base64Data);
      console.log(`[LoadWorkerPhoto] ${resultImage ? '✅' : '❌'} Base64 image loaded`);
    } else if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      console.log(`[LoadWorkerPhoto] Processing remote URL: ${photoPath}`);
      // Handle remote URLs with cache busting
      try {
        const response = await fetch(`${photoPath}?t=${timestamp}`);
        if (!response.ok) throw new Error('Failed to fetch image');
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Optimize and cache (returns PNG)
        optimizedBuffer = await optimizeImage(buffer);
        imageCache.set(photoPath, optimizedBuffer);
        
        // 🎯 EMERGENCY FIX: Use PNG embed (optimizer returns PNG)
        try {
          resultImage = await pdfDoc.embedPng(optimizedBuffer);
          console.log(`[LoadWorkerPhoto] ✅ Remote image loaded successfully as PNG`);
        } catch (embedError) {
          console.warn(`[LoadWorkerPhoto] ⚠️ PNG embed failed, trying JPEG:`, embedError);
          try {
            const sharp = (await import('sharp')).default;
            const jpegBuffer = await sharp(buffer).jpeg({ quality: 95, progressive: false, mozjpeg: false }).toBuffer();
            resultImage = await pdfDoc.embedJpg(jpegBuffer);
            optimizedBuffer = jpegBuffer; // Update cached buffer
            imageCache.set(photoPath, jpegBuffer);
            console.log(`[LoadWorkerPhoto] ✅ Remote image loaded as PNG fallback`);
          } catch (pngError) {
            console.error(`[LoadWorkerPhoto] ❌ Both JPG and PNG embed failed`);
            return null;
          }
        }
      } catch (error) {
        console.warn(`[LoadWorkerPhoto] ❌ Failed to fetch remote image:`, error);
        return null;
      }
    } else {
      console.log(`[LoadWorkerPhoto] Processing local file path`);
      // 🎯 OPTIMIZED: Smart local file path resolution with fallback
      const path = await import('path');
      const { existsSync } = await import('fs');

      // Determine primary path
      let finalPath: string;
      let found = false;
      
      if (photoPath.startsWith('/api/files/')) {
        // Parse API file path: /api/files/{userId}/{category}/{filename}
        const apiParts = photoPath.split('/');
        if (apiParts.length >= 5) {
          const [, , , userId, category, ...filenameParts] = apiParts;
          const filename = filenameParts.join('/');
          
          if (userId && category && filename) {
            // Map category to folder - CRITICAL for worker photos
            const categoryFolders: Record<string, string> = {
              sika: 'dokumen-sika',
              simja: 'dokumen-simja',
              hsse: 'dokumen-hsse',
              'hsse-worker': 'dokumen-hsse-pekerja',  // ⭐ CRITICAL for HSSE docs
              'worker-hsse': 'dokumen-hsse-pekerja',  // ⭐ Alternative naming
              document: 'dokumen',
              'worker-photo': 'foto-pekerja',  // ⭐ CRITICAL MAPPING
              'foto-pekerja': 'foto-pekerja'   // ⭐ Alternative format
            };
            
            const folderName = categoryFolders[category] || category;
            finalPath = path.join(process.cwd(), 'public', 'uploads', userId, folderName, filename);
            console.log(`[LoadWorkerPhoto] API path parsed: userId=${userId}, category=${category}, filename=${filename}`);
            console.log(`[LoadWorkerPhoto] Mapped category "${category}" → folder "${folderName}"`);
          } else {
            finalPath = path.join(process.cwd(), 'public', photoPath.replace('/api/files/', '/uploads/'));
          }
        } else {
          finalPath = path.join(process.cwd(), 'public', photoPath.replace('/api/files/', '/uploads/'));
        }
      } else if (photoPath.startsWith('/uploads/')) {
        finalPath = path.join(process.cwd(), 'public', photoPath);
      } else {
        finalPath = photoPath.startsWith('/') 
          ? path.join(process.cwd(), 'public', photoPath)
          : path.join(process.cwd(), 'public', 'uploads', photoPath);
      }
      
      // Check primary path first
      if (existsSync(finalPath)) {
        found = true;
        console.log(`[LoadWorkerPhoto] ✅ Found at primary path: ${finalPath}`);
      } else {
        console.log(`[LoadWorkerPhoto] ⚠️ Not found at primary path: ${finalPath}`);
        // 🎯 SMART FALLBACK: Try common alternative paths
        const alternatives: string[] = [];
        
        // Extract filename from original path
        const filename = photoPath.split('/').pop() || '';
        
        if (photoPath.startsWith('/api/files/')) {
          // Try alternative API path formats
          const apiParts = photoPath.split('/');
          if (apiParts.length >= 5) {
            const userId = apiParts[3];
            const category = apiParts[4];
            const fname = apiParts.slice(5).join('/');
            
            if (userId && fname) {
              alternatives.push(
                // Try category-specific folders
                path.join(process.cwd(), 'public', 'uploads', userId, 'foto-pekerja', fname),
                path.join(process.cwd(), 'public', 'uploads', userId, 'dokumen-hsse-pekerja', fname), // ⭐ HSSE docs
                // Try direct uploads
                path.join(process.cwd(), 'public', 'uploads', userId, fname),
                // Try without category folder
                path.join(process.cwd(), 'public', 'uploads', fname)
              );
              
              console.log(`[LoadWorkerPhoto] Parsed API path: userId=${userId}, category=${category}, filename=${fname}`);
            }
          }
        } else {
          // Try standard fallback paths
          alternatives.push(
            path.join(process.cwd(), 'public', photoPath),
            path.join(process.cwd(), 'public', 'uploads', photoPath),
            path.join(process.cwd(), 'public', 'uploads', filename),
            photoPath.startsWith('/') 
              ? path.join(process.cwd(), 'public', photoPath.substring(1))
              : path.join(process.cwd(), 'public', photoPath)
          );
        }
        
        // Try each alternative (deduplicated)
        const uniqueAlternatives = [...new Set(alternatives)];
        console.log(`[LoadWorkerPhoto] Trying ${uniqueAlternatives.length} alternative paths...`);
        
        for (const altPath of uniqueAlternatives) {
          if (altPath !== finalPath && existsSync(altPath)) {
            console.log(`[LoadWorkerPhoto] ✅ Found at alternative path: ${altPath}`);
            finalPath = altPath;
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        console.error(`[LoadWorkerPhoto] ❌ File not found at any path:`, {
          originalPath: photoPath,
          primaryPath: finalPath,
          cwd: process.cwd()
        });
        return null;
      }
      
      console.log(`[LoadWorkerPhoto] Loading file from: ${finalPath}`);
      const loadResult = await loadFileImage(pdfDoc, finalPath);
      
      if (loadResult) {
        resultImage = loadResult.image;
        optimizedBuffer = loadResult.buffer;
      }
    }

    // Validate and cache result
    if (resultImage) {
      try {
        const imgDims = resultImage.scale(1);
        if (imgDims.width > 0 && imgDims.height > 0) {
          // Cache the optimized buffer if we have it
          if (optimizedBuffer) {
            imageCache.set(photoPath, optimizedBuffer);
          }
          console.log(`[LoadWorkerPhoto] ✅ SUCCESS - Loaded and cached: ${photoPath} (${imgDims.width}x${imgDims.height})`);
          return resultImage;
        } else {
          console.warn(`[LoadWorkerPhoto] ⚠️ Invalid image dimensions (0x0): ${photoPath}`);
          return null;
        }
      } catch (error) {
        console.warn(`[LoadWorkerPhoto] ⚠️ Failed to validate image:`, error);
        return null;
      }
    }

    console.warn(`[LoadWorkerPhoto] ❌ Result image is null for: ${photoPath}`);
    return null;
  } catch (error) {
    console.error(`[LoadWorkerPhoto] ❌ Error loading photo:`, error);
    return null;
  }
}

/**
 * Load worker photos in batches with improved error handling and parallel processing
 * FIXED: Also preload HSSE documents for workers
 */
export async function preloadWorkerPhotos(
  pdfDoc: PDFDocument,
  workerList: Array<{ 
    worker_photo?: string | null;
    hsse_pass_document_upload?: string | null;
  }>
): Promise<void> {
  // Filter out cached and null photos
  const photosToLoad = workerList
    .filter(w => w.worker_photo && !imageCache.has(w.worker_photo))
    .map(w => w.worker_photo as string);

  // 🎯 PERFORMANCE FIX: SKIP HSSE documents during preload (they're heavy PDFs)
  // Documents will be loaded on-demand when rendering the document section
  // This significantly speeds up PDF generation since most documents aren't visible in preview

  const totalItems = photosToLoad.length;

  if (totalItems === 0) {
    console.log('PreloadWorkerPhotos: All photos already cached or empty');
    return;
  }

  console.log(`PreloadWorkerPhotos: Loading ${photosToLoad.length} worker photos in batches of ${MAX_BATCH_SIZE}...`);
  const startTime = Date.now();

  // 🎯 PERFORMANCE FIX: Only load photos, not documents

  // 🎯 PERFORMANCE FIX: Process in larger batches with Promise.allSettled
  for (let i = 0; i < photosToLoad.length; i += MAX_BATCH_SIZE) {
    const batch = photosToLoad.slice(i, i + MAX_BATCH_SIZE);
    const batchNumber = Math.floor(i / MAX_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(photosToLoad.length / MAX_BATCH_SIZE);
    
    console.log(`PreloadWorkerPhotos: Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
    
    try {
      // Use Promise.allSettled to continue even if some images fail
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          try {
            const loadPromise = loadWorkerPhoto(pdfDoc, item);
            
            // Add timeout to prevent hanging on slow images
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Load timeout')), LOAD_TIMEOUT)
            );
            await Promise.race([loadPromise, timeoutPromise]);
          } catch (error) {
            console.warn(`PreloadWorkerPhotos: Failed to load photo: ${item}`, error);
            // Don't throw - continue with other items
          }
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      console.log(`PreloadWorkerPhotos: Batch ${batchNumber} complete - ${successful} successful, ${failed} failed`);
      
      // Reduced delay between batches for better performance
      if (i + MAX_BATCH_SIZE < photosToLoad.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    } catch (error) {
      console.warn(`PreloadWorkerPhotos: Batch ${batchNumber} processing failed:`, error);
      // Continue with next batch
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(`PreloadWorkerPhotos: Completed loading ${photosToLoad.length} photos in ${elapsed}ms (avg ${Math.round(elapsed / photosToLoad.length)}ms per item)`);
  console.log(`PreloadWorkerPhotos: Cache size: ${imageCache.size} images`);
}

/**
 * Result type for document loading
 */
export interface DocumentLoadResult {
  type: 'image' | 'pdf' | 'unsupported';
  image?: PDFImage;
  pdfPages?: PDFDocument;
  error?: string;
  filePath?: string; // Absolute path to the file (for fallback conversion)
}

/**
 * Load worker document (can be image or PDF)
 * Returns information about the document type and content
 * 🎯 IMPROVED: Better error handling, flexible image/PDF support
 * 🐛 DEBUG: Enhanced logging for troubleshooting
 */
export async function loadWorkerDocument(
  pdfDoc: PDFDocument,
  documentPath?: string | null
): Promise<DocumentLoadResult> {
  if (!documentPath) {
    console.log('[LoadWorkerDocument] No document path provided');
    return { type: 'unsupported', error: 'No path provided' };
  }

  console.log(`[LoadWorkerDocument] Starting load for: ${documentPath}`);

  try {
    // Determine file type from extension
    const lowerPath = documentPath.toLowerCase();
    const isPdf = lowerPath.endsWith('.pdf');
    const isImage = lowerPath.match(/\.(jpg|jpeg|png|webp)$/);

    if (!isPdf && !isImage) {
      console.warn(`[LoadWorkerDocument] ⚠️ Unsupported file type: ${documentPath}`);
      return { type: 'unsupported', error: 'Unsupported file type' };
    }

    // 🎯 FIX: For images, use loadWorkerPhoto with proper path handling
    if (isImage) {
      console.log(`[LoadWorkerDocument] Processing as IMAGE: ${documentPath}`);
      console.log(`[LoadWorkerDocument] 🔍 DEBUG - Full document path: ${documentPath}`);
      console.log(`[LoadWorkerDocument] 🔍 DEBUG - File extension: ${documentPath.split('.').pop()}`);
      
      try {
        const image = await loadWorkerPhoto(pdfDoc, documentPath);
        if (image) {
          console.log(`[LoadWorkerDocument] ✅ Image loaded successfully`);
          return { type: 'image', image };
        } else {
          console.warn(`[LoadWorkerDocument] ⚠️ Image loading returned null for: ${documentPath}`);
          return { type: 'unsupported', error: 'Failed to load image' };
        }
      } catch (error) {
        console.error(`[LoadWorkerDocument] ❌ Image loading failed for: ${documentPath}`, error);
        return { type: 'unsupported', error: `Image loading error: ${error}` };
      }
    }

    // For PDF, load the PDF file with enhanced error handling
    if (isPdf) {
      console.log(`[LoadWorkerDocument] Processing as PDF: ${documentPath}`);
      const path = await import('path');
      const { readFile } = await import('fs/promises');
      const { existsSync } = await import('fs');
      
      let finalPath: string;
      let found = false;
      
      if (documentPath.startsWith('/api/files/')) {
        // Parse API file path: /api/files/{userId}/{category}/{filename}
        const apiParts = documentPath.split('/');
        if (apiParts.length >= 5) {
          const [, , , userId, category, ...filenameParts] = apiParts;
          const filename = filenameParts.join('/');
          
          if (!userId || !category || !filename) {
            console.warn('[LoadWorkerDocument] ⚠️ Invalid API path structure');
            return { type: 'unsupported', error: 'Invalid path structure' };
          }
          
          // 🎯 CRITICAL: Enhanced category mapping for all document types
          const categoryFolders: Record<string, string> = {
            sika: 'dokumen-sika',
            simja: 'dokumen-simja',
            'work-order': 'dokumen-work-order',
            'kontrak-kerja': 'dokumen-kontrak-kerja',
            jsa: 'dokumen-jsa',
            'hsse-worker': 'dokumen-hsse-pekerja',  // ⭐ CRITICAL for HSSE docs
            'worker-hsse': 'dokumen-hsse-pekerja',  // ⭐ Alternative naming
            'worker-photo': 'foto-pekerja'
          };
          
          const folderName = categoryFolders[category] || category;
          finalPath = path.join(process.cwd(), 'public', 'uploads', userId, folderName, filename);
          console.log(`[LoadWorkerDocument] Mapped category "${category}" → folder "${folderName}"`);
        } else {
          finalPath = path.join(process.cwd(), 'public', documentPath.replace('/api/files/', '/uploads/'));
        }
      } else if (documentPath.startsWith('/uploads/')) {
        finalPath = path.join(process.cwd(), 'public', documentPath);
      } else if (documentPath.startsWith('/')) {
        finalPath = path.join(process.cwd(), 'public', documentPath);
      } else {
        finalPath = documentPath;
      }

      console.log(`[LoadWorkerDocument] Resolved primary path: ${finalPath}`);
      
      // 🎯 FIX: Check file existence with smart fallback
      if (!existsSync(finalPath)) {
        console.log(`[LoadWorkerDocument] ⚠️ Not found at primary path`);
        
        // 🎯 SMART FALLBACK: Try alternative paths for HSSE worker documents
        const alternatives: string[] = [];
        
        // Extract filename for alternative attempts
        const filename = documentPath.split('/').pop() || '';
        
        if (documentPath.startsWith('/api/files/')) {
          const apiParts = documentPath.split('/');
          if (apiParts.length >= 5) {
            const userId = apiParts[3];
            const fname = apiParts.slice(5).join('/');
            
            if (userId && fname) {
              alternatives.push(
                // Try dokumen-hsse-pekerja folder
                path.join(process.cwd(), 'public', 'uploads', userId, 'dokumen-hsse-pekerja', fname),
                // Try direct uploads
                path.join(process.cwd(), 'public', 'uploads', userId, fname),
                // Try without category folder
                path.join(process.cwd(), 'public', 'uploads', fname)
              );
            }
          }
        }
        
        // Standard fallback paths
        alternatives.push(
          path.join(process.cwd(), 'public', documentPath.replace('/api/files/', '/uploads/')),
          path.join(process.cwd(), 'public', documentPath),
          path.join(process.cwd(), 'public', 'uploads', documentPath),
          path.join(process.cwd(), 'public', 'uploads', filename)
        );
        
        // Try each unique alternative
        const uniqueAlternatives = [...new Set(alternatives)];
        console.log(`[LoadWorkerDocument] Trying ${uniqueAlternatives.length} alternative paths...`);
        
        found = false;
        for (const altPath of uniqueAlternatives) {
          if (altPath !== finalPath && existsSync(altPath)) {
            console.log(`[LoadWorkerDocument] ✅ Found at alternative path: ${altPath}`);
            finalPath = altPath;
            found = true;
            break;
          }
        }
        
        if (!found) {
          console.error(`[LoadWorkerDocument] ❌ PDF not found at any location:`, {
            originalPath: documentPath,
            primaryPath: finalPath,
            alternativesTried: uniqueAlternatives.length
          });
          return { type: 'unsupported', error: 'PDF file not found' };
        }
      } else {
        console.log(`[LoadWorkerDocument] ✅ Found at primary path`);
        found = true;
      }

      try {
        console.log(`[LoadWorkerDocument] Reading PDF file: ${finalPath}`);
        
        // 🎯 FIX: Add timeout for file reading
        const readPromise = readFile(finalPath);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('File read timeout')), LOAD_TIMEOUT)
        );
        
        const pdfBytes = await Promise.race([readPromise, timeoutPromise]);
        console.log(`[LoadWorkerDocument] PDF bytes loaded: ${pdfBytes.length} bytes`);
        
        // 🎯 FIX: Validate PDF size (reject empty or too large PDFs)
        if (pdfBytes.length === 0) {
          console.error('[LoadWorkerDocument] ❌ PDF file is empty (0 bytes)');
          return { type: 'unsupported', error: 'PDF file is empty' };
        }
        
        if (pdfBytes.length > 50 * 1024 * 1024) { // 50MB max
          console.error(`[LoadWorkerDocument] ❌ PDF file too large: ${pdfBytes.length} bytes`);
          return { type: 'unsupported', error: 'PDF file too large (>50MB)' };
        }
        
        console.log('[LoadWorkerDocument] Loading PDF with pdf-lib...');
        
        // 🎯 FIX: Try to load PDF with better error handling
        try {
          const loadedPdf = await PDFDocument.load(pdfBytes, { 
            ignoreEncryption: true,
            updateMetadata: false,
            throwOnInvalidObject: false // Don't throw on minor PDF errors
          });
          
          console.log('[LoadWorkerDocument] PDF loaded successfully');
          
          const pageCount = loadedPdf.getPageCount();
          console.log(`[LoadWorkerDocument] PDF has ${pageCount} pages`);
          
          if (pageCount === 0) {
            console.error('[LoadWorkerDocument] ❌ PDF has no pages');
            return { type: 'unsupported', error: 'PDF has no pages' };
          }
          
          console.log(`[LoadWorkerDocument] ✅ SUCCESS - PDF loaded with ${pageCount} page(s)`);
          return { type: 'pdf', pdfPages: loadedPdf, filePath: finalPath };
          
        } catch (pdfError) {
          console.error('[LoadWorkerDocument] ❌ PDF parsing failed:', pdfError);
          
          // Try to determine error type
          const errorStr = String(pdfError);
          if (errorStr.includes('encrypt') || errorStr.includes('password')) {
            return { type: 'unsupported', error: 'PDF is encrypted or password protected' };
          } else if (errorStr.includes('Invalid PDF') || errorStr.includes('corrupted')) {
            return { type: 'unsupported', error: 'PDF file is corrupted or invalid' };
          } else {
            return { type: 'unsupported', error: `PDF parsing error: ${errorStr.substring(0, 100)}` };
          }
        }
        
      } catch (error) {
        console.error('[LoadWorkerDocument] ❌ Failed to read/process PDF:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('timeout')) {
          return { type: 'unsupported', error: 'PDF file loading timeout (>5s)' };
        }
        
        return { type: 'unsupported', error: `Failed to read PDF: ${errorMessage}` };
      }
    }

    // Fallback for unknown file types
    console.warn(`[LoadWorkerDocument] ⚠️ Unknown file type: ${documentPath}`);
    return { type: 'unsupported', error: 'Unknown file type' };
    
  } catch (error) {
    console.error('[LoadWorkerDocument] ❌ Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { type: 'unsupported', error: errorMessage };
  }
}

/**
 * Clear the image cache
 */
export function clearImageCache(): void {
  imageCache.clear();
  pdfConversionCache.clear();
}

// Cache for Ghostscript PDF conversions (stores PNG buffers, not embedded images)
const pdfConversionCache = new Map<string, Buffer[]>();

/**
 * Convert PDF file to PNG images using Ghostscript (external binary)
 * This is used as a fallback when pdf-lib cannot handle the PDF (e.g., mozjpeg compression)
 * @param pdfPath - Absolute path to the PDF file
 * @param pdfDoc - The PDFDocument to embed images into
 * @returns Array of embedded PNG images, one per page
 */
export async function convertPdfToImages(
  pdfPath: string,
  pdfDoc: PDFDocument
): Promise<{ success: boolean; images: PDFImage[]; error?: string }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');
  
  try {
    // Check cache first
    const cachedBuffers = pdfConversionCache.get(pdfPath);
    if (cachedBuffers && cachedBuffers.length > 0) {
      console.log(`[ConvertPdfToImages] ✅ Using cached conversion for ${path.basename(pdfPath)} (${cachedBuffers.length} pages)`);
      
      // Embed cached buffers into the new PDF document
      const images: PDFImage[] = [];
      for (const buffer of cachedBuffers) {
        const embeddedImage = await pdfDoc.embedPng(buffer);
        images.push(embeddedImage);
      }
      return { success: true, images };
    }
    
    const tempDir = path.join(os.tmpdir(), `pdf-convert-${Date.now()}`);
  
    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });
    
    // Use Ghostscript to convert PDF to PNG
    // -dSAFER = safer mode
    // -dBATCH = exit after processing  
    // -dNOPAUSE = don't pause between pages
    // -sDEVICE=pnggray = grayscale PNG (faster)
    // -r72 = 72 DPI (lower resolution for speed, still readable)
    // -dNumRenderingThreads=2 = use 2 threads for rendering
    // -sOutputFile = output file pattern (%d = page number)
    const gsCommand = `gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=pnggray -r72 -dNumRenderingThreads=2 -sOutputFile="${tempDir}/page-%d.png" "${pdfPath}"`;
    
    console.log(`[ConvertPdfToImages] Running Ghostscript for ${path.basename(pdfPath)}...`);
    
    try {
      await execAsync(gsCommand, { timeout: 60000 }); // 60 second timeout for large PDFs
    } catch (gsError: any) {
      // Check if gs is installed
      if (gsError.message?.includes('command not found') || gsError.message?.includes('not recognized')) {
        console.error('[ConvertPdfToImages] ❌ Ghostscript (gs) not installed');
        return { success: false, images: [], error: 'Ghostscript not installed on server' };
      }
      throw gsError;
    }
    
    // Read generated PNG files
    const files = fs.readdirSync(tempDir)
      .filter((f: string) => f.startsWith('page-') && f.endsWith('.png'))
      .sort((a: string, b: string) => {
        const numA = parseInt(a.replace('page-', '').replace('.png', ''));
        const numB = parseInt(b.replace('page-', '').replace('.png', ''));
        return numA - numB;
      });
    
    if (files.length === 0) {
      fs.rmdirSync(tempDir);
      return { success: false, images: [], error: 'No pages generated' };
    }
    
    // Read and cache PNG buffers, then embed into PDF document
    const pngBuffers: Buffer[] = [];
    const images: PDFImage[] = [];
    
    for (const file of files) {
      const pngPath = path.join(tempDir, file);
      const pngBuffer = fs.readFileSync(pngPath);
      pngBuffers.push(pngBuffer);
      
      // Embed directly without additional optimization (already grayscale 72dpi)
      const embeddedImage = await pdfDoc.embedPng(pngBuffer);
      images.push(embeddedImage);
      
      // Clean up the temp file
      fs.unlinkSync(pngPath);
    }
    
    // Cache the PNG buffers for future use
    pdfConversionCache.set(pdfPath, pngBuffers);
    
    // Clean up temp directory
    fs.rmdirSync(tempDir);
    
    console.log(`[ConvertPdfToImages] ✅ Successfully converted ${images.length} pages`);
    return { success: true, images };
    
  } catch (error: any) {
    console.error('[ConvertPdfToImages] ❌ Error:', error.message);
    
    // Clean up temp directory on error
    try {
      const fs = await import('fs');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch { /* ignore cleanup errors */ }
    
    return { success: false, images: [], error: error.message };
  }
}