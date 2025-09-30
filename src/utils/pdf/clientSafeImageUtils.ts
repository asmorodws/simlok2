/**
 * Client-safe image utilities that don't depend on Node.js modules
 * Use this for client-side image operations if needed
 */

/**
 * Check if an image URL is accessible
 */
export async function checkImageUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get image dimensions from URL (client-safe)
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Convert image to base64 (client-safe)
 */
export function imageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file type
 */
export function validateImageType(file: File): boolean {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return allowedTypes.includes(file.type.toLowerCase());
}

/**
 * Validate image file size (in bytes)
 */
export function validateImageSize(file: File, maxSizeBytes: number = 5 * 1024 * 1024): boolean {
  return file.size <= maxSizeBytes;
}