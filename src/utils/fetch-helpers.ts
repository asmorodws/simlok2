/**
 * Safely parse JSON from response with fallback
 * Prevents "Unexpected end of JSON input" errors
 */
export async function safeJsonParse<T = any>(
  response: Response,
  fallback: T = {} as T
): Promise<T> {
  try {
    return await response.json();
  } catch (error) {
    console.warn('Failed to parse JSON response:', error);
    return fallback;
  }
}

/**
 * Fetch with automatic error handling
 * Returns parsed data or throws error with proper message
 */
export async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<any> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await safeJsonParse<{ error?: string; message?: string }>(response, { error: 'Request failed' });
    throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
  }

  return await response.json();
}

/**
 * Handle fetch error and extract error message
 */
export function extractErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}
