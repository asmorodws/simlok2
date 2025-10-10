'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoRefreshOptions {
  /**
   * Interval in milliseconds for auto-refresh (default: 30000ms = 30 seconds)
   */
  interval?: number;
  
  /**
   * Whether auto-refresh is enabled (default: true)
   */
  enabled?: boolean;
  
  /**
   * Whether to refresh immediately when the hook is mounted (default: false)
   */
  refreshOnMount?: boolean;
  
  /**
   * Function to call when refresh is triggered
   */
  onRefresh: () => void | Promise<void>;
  
  /**
   * Dependencies that should trigger a refresh when changed
   */
  dependencies?: any[];
}

interface UseAutoRefreshReturn {
  /**
   * Whether auto-refresh is currently active
   */
  isActive: boolean;
  
  /**
   * Manually trigger a refresh
   */
  refresh: () => void;
  
  /**
   * Start auto-refresh
   */
  start: () => void;
  
  /**
   * Stop auto-refresh
   */
  stop: () => void;
  
  /**
   * Time until next refresh (in seconds)
   */
  timeUntilNext: number;
}

export function useAutoRefresh({
  interval = 30000, // 30 seconds
  enabled = true,
  refreshOnMount = false,
  onRefresh,
  dependencies = []
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [isActive, setIsActive] = useState(enabled);
  const [timeUntilNext, setTimeUntilNext] = useState(0);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Manual refresh function
  const refresh = useCallback(async () => {
    try {
      await onRefresh();
      // Reset countdown after successful refresh
      setTimeUntilNext(interval / 1000);
    } catch (error) {
      console.error('Auto-refresh error:', error);
    }
  }, [onRefresh, interval]);

  // Start countdown
  const startCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    
    setTimeUntilNext(interval / 1000);
    
    countdownRef.current = setInterval(() => {
      setTimeUntilNext(prev => {
        if (prev <= 1) {
          return interval / 1000;
        }
        return prev - 1;
      });
    }, 1000);
  }, [interval]);

  // Start auto-refresh
  const start = useCallback(() => {
    cleanup();
    setIsActive(true);
    startCountdown();

    intervalRef.current = setInterval(() => {
      refresh();
    }, interval);
  }, [cleanup, refresh, interval, startCountdown]);

  // Stop auto-refresh
  const stop = useCallback(() => {
    cleanup();
    setIsActive(false);
    setTimeUntilNext(0);
  }, [cleanup]);

  // Effect to handle enabled state changes
  useEffect(() => {
    if (enabled && !isActive) {
      start();
    } else if (!enabled && isActive) {
      stop();
    }
  }, [enabled, isActive, start, stop]);

  // Effect to handle dependency changes
  useEffect(() => {
    if (isActive) {
      // Reset timer when dependencies change
      start();
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect for mount behavior
  useEffect(() => {
    if (refreshOnMount) {
      refresh();
    }
    
    if (enabled) {
      start();
    }

    // Cleanup on unmount
    return cleanup;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause refresh when page is not visible (performance optimization)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isActive) {
        stop();
      } else if (!document.hidden && enabled) {
        start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, enabled, start, stop]);

  return {
    isActive,
    refresh,
    start,
    stop,
    timeUntilNext
  };
}

export default useAutoRefresh;