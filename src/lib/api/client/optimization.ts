/**
 * Utilities untuk optimasi API calls
 * Debouncing, Throttling, dan Request Batching
 */

/**
 * Debounce function - menunda eksekusi hingga delay terlewati tanpa ada call baru
 * Berguna untuk search input, auto-save, dll
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function debounced(...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function - membatasi eksekusi maksimal sekali per interval
 * Berguna untuk scroll events, resize events, dll
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  let lastResult: ReturnType<T>;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Request deduplication - mencegah duplicate API calls
 */
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const key = `${url}_${JSON.stringify(options)}`;

  // Jika ada request yang sama sedang berjalan, gunakan yang sama
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  // Buat request baru
  const promise = fetch(url, options)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .finally(() => {
      // Hapus dari pending setelah selesai
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Batch requests - menggabungkan multiple API calls menjadi satu
 */
interface BatchRequest {
  url: string;
  options: RequestInit | undefined;
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
}

class RequestBatcher {
  private queue: BatchRequest[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchDelay: number = 50; // 50ms delay untuk batching

  add<T>(url: string, options?: RequestInit): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });

      // Reset timeout setiap ada request baru
      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      // Flush queue setelah delay
      this.timeout = setTimeout(() => {
        this.flush();
      }, this.batchDelay);
    });
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const requests = [...this.queue];
    this.queue = [];
    this.timeout = null;

    // Execute all requests in parallel
    const results = await Promise.allSettled(
      requests.map(({ url, options }) =>
        fetch(url, options).then((res) => res.json())
      )
    );

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      const request = requests[index];
      if (!request) return;
      
      if (result.status === 'fulfilled') {
        request.resolve(result.value);
      } else {
        request.reject(result.reason);
      }
    });
  }
}

export const requestBatcher = new RequestBatcher();

/**
 * Retry failed requests dengan exponential backoff
 */
export async function fetchWithRetry<T>(
  url: string,
  options?: RequestInit & { maxRetries?: number; retryDelay?: number }
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000, ...fetchOptions } = options || {};
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;

      // Jangan retry untuk error tertentu (4xx client errors)
      if (error instanceof Error && error.message.includes('4')) {
        throw error;
      }

      // Tunggu sebelum retry dengan exponential backoff
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Cancel previous fetch request (AbortController wrapper)
 */
export class CancellableFetch {
  private controller: AbortController | null = null;

  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    // Cancel previous request jika ada
    if (this.controller) {
      this.controller.abort();
    }

    // Create new controller
    this.controller = new AbortController();

    try {
      const response = await fetch(url, {
        ...options,
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request was cancelled');
      }
      throw error;
    } finally {
      this.controller = null;
    }
  }

  cancel() {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }
}

/**
 * Polling dengan smart interval adjustment
 */
export class SmartPolling {
  private intervalId: NodeJS.Timeout | null = null;
  private baseInterval: number;
  private maxInterval: number;
  private currentInterval: number;
  private errorCount: number = 0;

  constructor(baseInterval: number = 5000, maxInterval: number = 60000) {
    this.baseInterval = baseInterval;
    this.maxInterval = maxInterval;
    this.currentInterval = baseInterval;
  }

  start(callback: () => Promise<void>) {
    this.stop();

    const poll = async () => {
      try {
        await callback();
        
        // Reset interval on success
        this.errorCount = 0;
        this.currentInterval = this.baseInterval;
      } catch (error) {
        console.error('Polling error:', error);
        
        // Increase interval on error (exponential backoff)
        this.errorCount++;
        this.currentInterval = Math.min(
          this.baseInterval * Math.pow(2, this.errorCount),
          this.maxInterval
        );
      }

      // Schedule next poll
      this.intervalId = setTimeout(poll, this.currentInterval);
    };

    // Start polling
    poll();
  }

  stop() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.errorCount = 0;
    this.currentInterval = this.baseInterval;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }
}
