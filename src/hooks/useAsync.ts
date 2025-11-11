'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface AsyncState<T> {
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: T | null;
  error: Error | null;
}

export interface UseAsyncReturn<T, Args extends any[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
  setData: (data: T | null) => void;
}

/**
 * Custom hook for managing async operations (API calls, async functions)
 * Automatically handles loading, error, and success states
 * 
 * @template T - The type of the data returned by the async function
 * @template Args - The types of arguments passed to the async function
 * @param asyncFunction - The async function to execute
 * @param immediate - Whether to execute the function immediately (default: false)
 * @returns AsyncState and control functions
 * 
 * @example
 * const { isLoading, isError, data, error, execute, reset } = useAsync(
 *   async (userId: string) => {
 *     const response = await fetch(`/api/users/${userId}`);
 *     return response.json();
 *   }
 * );
 * 
 * // Execute manually
 * const handleClick = () => {
 *   execute('user123');
 * };
 * 
 * // Reset state
 * const handleReset = () => {
 *   reset();
 * };
 */
export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate: boolean = false
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    isLoading: false,
    isError: false,
    isSuccess: false,
    data: null,
    error: null,
  });

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState({
        isLoading: true,
        isError: false,
        isSuccess: false,
        data: null,
        error: null,
      });

      try {
        const data = await asyncFunction(...args);
        
        if (isMountedRef.current) {
          setState({
            isLoading: false,
            isError: false,
            isSuccess: true,
            data,
            error: null,
          });
        }
        
        return data;
      } catch (error) {
        if (isMountedRef.current) {
          setState({
            isLoading: false,
            isError: true,
            isSuccess: false,
            data: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
        
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({
        isLoading: false,
        isError: false,
        isSuccess: false,
        data: null,
        error: null,
      });
    }
  }, []);

  const setData = useCallback((data: T | null) => {
    if (isMountedRef.current) {
      setState({
        isLoading: false,
        isError: false,
        isSuccess: true,
        data,
        error: null,
      });
    }
  }, []);

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [immediate]);

  return {
    ...state,
    execute,
    reset,
    setData,
  };
}
