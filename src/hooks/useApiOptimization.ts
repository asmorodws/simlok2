/**
 * Custom React hooks untuk optimasi API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedFetch, apiCache } from '@/lib/api/client';
import { debounce, CancellableFetch, SmartPolling } from '@/lib/api/client';

interface UseFetchOptions<T> {
  enabled?: boolean;
  cacheTTL?: number;
  skipCache?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  invalidateCache: () => void;
}

/**
 * Custom hook untuk fetch data dengan cache dan auto-refetch
 */
export function useFetch<T>(
  url: string | null,
  options: UseFetchOptions<T> = {}
): UseFetchResult<T> {
  const {
    enabled = true,
    cacheTTL,
    skipCache = false,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchRef = useRef(new CancellableFetch());
  const pollingRef = useRef<SmartPolling | null>(null);

  const fetchData = useCallback(async () => {
    if (!url || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await cachedFetch<T>(url, { 
        ...(cacheTTL !== undefined && { cacheTTL }), 
        skipCache 
      });

      setData(result);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
    }
  }, [url, enabled, cacheTTL, skipCache, onSuccess, onError]);

  const invalidateCache = useCallback(() => {
    if (url) {
      apiCache.delete(url);
    }
  }, [url]);

  // Initial fetch
  useEffect(() => {
    if (enabled && url) {
      fetchData();
    }

    return () => {
      fetchRef.current.cancel();
    };
  }, [url, enabled, fetchData]);

  // Auto-refetch with smart polling
  useEffect(() => {
    if (refetchInterval && url && enabled) {
      pollingRef.current = new SmartPolling(refetchInterval);
      pollingRef.current.start(fetchData);

      return () => {
        pollingRef.current?.stop();
      };
    }
    return undefined;
  }, [refetchInterval, url, enabled, fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    invalidateCache,
  };
}

/**
 * Custom hook untuk debounced search
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string) => Promise<T>,
  delay: number = 500
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults(null);
        setIsSearching(false);
        return;
      }

      try {
        setIsSearching(true);
        setError(null);
        const data = await searchFn(searchQuery);
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Search failed'));
      } finally {
        setIsSearching(false);
      }
    }, delay),
    [searchFn, delay]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
  };
}

/**
 * Custom hook untuk pagination dengan cache
 */
interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
  cacheTTL?: number;
}

interface UsePaginationResult<T> {
  data: T[];
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: Error | null;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  refetch: () => Promise<void>;
}

export function usePagination<T>(
  baseUrl: string,
  options: UsePaginationOptions = {}
): UsePaginationResult<T> {
  const { initialPage = 1, pageSize = 10, cacheTTL } = options;

  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<T[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const url = `${baseUrl}?page=${page}&limit=${pageSize}`;
      const result = await cachedFetch<{ data: T[]; total: number; totalPages: number }>(
        url,
        cacheTTL !== undefined ? { cacheTTL } : {}
      );

      setData(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, page, pageSize, cacheTTL]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  return {
    data,
    page,
    totalPages,
    isLoading,
    error,
    nextPage: () => setPage((p: number) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p: number) => Math.max(p - 1, 1)),
    goToPage: (newPage: number) => setPage(Math.max(1, Math.min(newPage, totalPages))),
    refetch: fetchPage,
  };
}

/**
 * Custom hook untuk optimistic updates
 */
export function useOptimisticUpdate<T>(
  initialData: T | null,
  updateFn: (data: T) => Promise<T>
) {
  const [data, setData] = useState<T | null>(initialData);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousDataRef = useRef<T | null>(null);

  const update = useCallback(
    async (newData: T) => {
      // Store previous data for rollback
      previousDataRef.current = data;

      // Optimistically update UI
      setData(newData);
      setIsUpdating(true);
      setError(null);

      try {
        // Perform actual update
        const result = await updateFn(newData);
        setData(result);
      } catch (err) {
        // Rollback on error
        setData(previousDataRef.current);
        setError(err instanceof Error ? err : new Error('Update failed'));
      } finally {
        setIsUpdating(false);
      }
    },
    [data, updateFn]
  );

  return {
    data,
    isUpdating,
    error,
    update,
  };
}

/**
 * Custom hook untuk infinite scroll
 */
interface UseInfiniteScrollOptions {
  pageSize?: number;
  cacheTTL?: number;
  threshold?: number; // Distance from bottom to trigger load
}

interface UseInfiniteScrollResult<T> {
  data: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  reset: () => void;
  observerRef: (node: HTMLElement | null) => void;
}

export function useInfiniteScroll<T>(
  baseUrl: string,
  options: UseInfiniteScrollOptions = {}
): UseInfiniteScrollResult<T> {
  const { pageSize = 20, cacheTTL, threshold = 0.8 } = options;

  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;

    try {
      setIsLoading(true);
      setError(null);

      const url = `${baseUrl}?page=${page}&limit=${pageSize}`;
      const result = await cachedFetch<{ data: T[]; hasMore: boolean }>(
        url,
        cacheTTL !== undefined ? { cacheTTL } : {}
      );

      setData((prev) => [...prev, ...result.data]);
      setHasMore(result.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load more'));
    } finally {
      setIsLoading(false);
    }
  }, [baseUrl, page, pageSize, cacheTTL, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, []);

  const lastElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (isLoading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasMore) {
            loadMore();
          }
        },
        { threshold }
      );

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [isLoading, hasMore, loadMore, threshold]
  );

  // Initial load
  useEffect(() => {
    if (data.length === 0) {
      loadMore();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadMore,
    reset,
    observerRef: lastElementRef,
  };
}
