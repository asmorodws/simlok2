import { PDFDocument, PDFImage } from 'pdf-lib';

const MAX_IMAGE_SIZE = 800; // Maximum size for either width or height
const MAX_CONCURRENT_LOADS = 3; // Maximum number of concurrent image loads
const imageCache = new Map<string, PDFImage>();

// Semaphore for limiting concurrent image loads
let activeLoads = 0;
const loadQueue: (() => void)[] = [];

function executeNextLoad() {
  if (activeLoads < MAX_CONCURRENT_LOADS && loadQueue.length > 0) {
    const nextLoad = loadQueue.shift();
    if (nextLoad) nextLoad();
  }
}

export function clearImageCache() {
  imageCache.clear();
}

async function compressImage(imageData: ArrayBuffer): Promise<ArrayBuffer> {
  if (typeof window !== 'undefined') {
    // Client-side compression
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions while maintaining aspect ratio
        if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
          if (width > height) {
            height = Math.round(height * MAX_IMAGE_SIZE / width);
            width = MAX_IMAGE_SIZE;
          } else {
            width = Math.round(width * MAX_IMAGE_SIZE / height);
            height = MAX_IMAGE_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Could not convert to blob'));
            return;
          }
          
          // Convert blob to ArrayBuffer
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.onerror = reject;
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.7); // Compress with 70% quality
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(new Blob([imageData]));
    });
  } else {
    // Server-side compression using Sharp
    try {
      const sharp = await import('sharp');
      const buffer = Buffer.from(imageData);
      
      const processedBuffer = await sharp.default(buffer)
        .resize(MAX_IMAGE_SIZE, MAX_IMAGE_SIZE, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 70 })
        .toBuffer();
      
      return processedBuffer.buffer as ArrayBuffer;
    } catch (error) {
      console.warn('Image compression failed:', error);
      return imageData;
    }
  }
}

export async function loadWorkerPhoto(pdfDoc: PDFDocument, photoPath?: string | null): Promise<PDFImage | null> {
  if (!photoPath) {
    return null;
  }

  // Check cache first
  if (imageCache.has(photoPath)) {
    return imageCache.get(photoPath)!;
  }

  // Wait for available slot if needed
  if (activeLoads >= MAX_CONCURRENT_LOADS) {
    await new Promise<void>(resolve => loadQueue.push(resolve));
  }
  activeLoads++;

  try {
    let resultImage: PDFImage | null = null;
    let imageData: ArrayBuffer | null = null;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries && !resultImage) {
      try {
        if (photoPath.startsWith('data:image/') || photoPath.startsWith('data:') || photoPath.match(/^[A-Za-z0-9+/=]+$/)) {
          // Handle base64 data
          let base64Data: string | undefined;
          const isPng = photoPath.includes('image/png');
          
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
            const photoBytes = Buffer.from(base64Data, 'base64');
            try {
              const compressedData = await compressImage(photoBytes.buffer);
              const compressedBuffer = Buffer.from(compressedData);
              resultImage = isPng 
                ? await pdfDoc.embedPng(compressedBuffer)
                : await pdfDoc.embedJpg(compressedBuffer);
            } catch (err) {
              console.warn('Using original image due to compression failure:', err);
              resultImage = isPng 
                ? await pdfDoc.embedPng(photoBytes)
                : await pdfDoc.embedJpg(photoBytes);
            }
          }
        } else {
          // Handle file path with API compatibility
          const fullPath = photoPath.startsWith('/api/files/') 
            ? photoPath.replace('/api/files/', '/uploads/')
            : photoPath.startsWith('/') ? photoPath : `/uploads/${photoPath}`;

          if (typeof window !== 'undefined') {
            // Client-side loading with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
              const response = await fetch(
                photoPath.startsWith('/api/files/') ? photoPath : fullPath,
                { signal: controller.signal }
              );
              
              if (response.ok) {
                imageData = await response.arrayBuffer();
              }
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                console.warn('Image load timeout:', photoPath);
              }
              throw error;
            } finally {
              clearTimeout(timeoutId);
            }
          } else {
            // Server-side loading with proper path resolution
            try {
              const fs = await import('fs');
              const path = await import('path');
              
              let photoFilePath: string;
              
              if (photoPath.startsWith('/api/files/')) {
                const apiParts = photoPath.split('/');
                if (apiParts.length >= 5) {
                  const [, , , userId, category, ...filenameParts] = apiParts;
                  const filename = filenameParts.join('/');
                  
                  if (!userId || !category || !filename) {
                    throw new Error('Invalid file path structure');
                  }
                  
                  const categoryFolders: Record<string, string> = {
                    sika: 'dokumen-sika',
                    simja: 'dokumen-simja',
                    id_card: 'id-card',
                    other: 'lainnya',
                    'worker-photo': 'foto-pekerja'
                  };
                  
                  const folderName = categoryFolders[category] || category;
                  photoFilePath = path.join(process.cwd(), 'public', 'uploads', userId, folderName, filename);
                } else {
                  throw new Error('Invalid API file path');
                }
              } else {
                photoFilePath = path.join(process.cwd(), 'public', fullPath);
              }
              
              if (!fs.existsSync(photoFilePath)) {
                throw new Error('File not found: ' + photoFilePath);
              }
              
              const fileBuffer = fs.readFileSync(photoFilePath);
              imageData = fileBuffer.buffer;
            } catch (error) {
              console.warn('Server-side image load failed:', error);
              throw error;
            }
          }

          if (imageData) {
            const isPng = fullPath.toLowerCase().includes('.png');
            try {
              const compressedData = await compressImage(imageData);
              const compressedBuffer = Buffer.from(compressedData);
              resultImage = isPng 
                ? await pdfDoc.embedPng(compressedBuffer)
                : await pdfDoc.embedJpg(compressedBuffer);
            } catch (err) {
              console.warn('Using original image due to compression failure:', err);
              const originalBuffer = Buffer.from(imageData);
              resultImage = isPng 
                ? await pdfDoc.embedPng(originalBuffer)
                : await pdfDoc.embedJpg(originalBuffer);
            }
          }
        }

        break; // Exit loop if successful
      } catch (error) {
        console.warn(`Attempt ${retryCount + 1} failed for ${photoPath}:`, error);
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          throw error;
        }
      }
    }

    if (resultImage) {
      // Clean cache if too large (keep last 20 images)
      if (imageCache.size > 20) {
        const keysToDelete = Array.from(imageCache.keys()).slice(0, imageCache.size - 20);
        keysToDelete.forEach(key => imageCache.delete(key));
      }
      imageCache.set(photoPath, resultImage);
    }

    return resultImage;
  } catch (error) {
    console.error('Failed to load worker photo:', error);
    return null;
  } finally {
    activeLoads--;
    executeNextLoad();
  }
}

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
    const batchPromises = batch.map(photo => loadWorkerPhoto(pdfDoc, photo));
    
    try {
      await Promise.all(batchPromises);
    } catch (error) {
      console.warn('Error loading batch of photos:', error);
    }
    
    // Small delay between batches
    if (i + batchSize < photosToLoad.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}