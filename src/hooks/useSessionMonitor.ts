/**
 * useSessionMonitor Hook
 * Monitors session status and handles expiry warnings
 */

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { forceLogout } from '@/utils/session-utils';

interface SessionStatus {
  isExpiring: boolean;
  minutesRemaining: number;
  expiryTime: Date | null;
}

export function useSessionMonitor() {
  const { status } = useSession();
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>({
    isExpiring: false,
    minutesRemaining: 0,
    expiryTime: null,
  });
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);

  // Check session status
  const checkSessionStatus = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const response = await fetch('/api/session/status');
      
      if (!response.ok) {
        if (response.status === 401) {
          console.log('Session invalid, logging out...');
          await forceLogout('Sesi tidak valid');
        }
        return;
      }

      const data = await response.json();
      setSessionStatus({
        isExpiring: data.isExpiring,
        minutesRemaining: data.minutesRemaining,
        expiryTime: data.expiryTime ? new Date(data.expiryTime) : null,
      });

      // Show warning if session is expiring
      if (data.isExpiring && !showExpiryWarning) {
        setShowExpiryWarning(true);
      }
    } catch (error) {
      console.error('Error checking session status:', error);
    }
  }, [status, showExpiryWarning]);

  // Refresh session
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/api/session/refresh', {
        method: 'POST',
      });

      if (response.ok) {
        console.log('Session refreshed successfully');
        setShowExpiryWarning(false);
        await checkSessionStatus(); // Update status after refresh
        return true;
      } else {
        console.error('Failed to refresh session');
        return false;
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      return false;
    }
  }, [checkSessionStatus]);

  // Validate session
  const validateSession = useCallback(async () => {
    if (status !== 'authenticated') return false;

    try {
      const response = await fetch('/api/session/validate');
      
      if (!response.ok) {
        if (response.status === 401) {
          const data = await response.json();
          console.log('Session validation failed:', data.reason);
          
          if (data.shouldLogout) {
            await forceLogout(data.reason || 'Sesi tidak valid');
          }
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      return false;
    }
  }, [status]);

  // Check session status periodically
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Initial check
    checkSessionStatus();

    // Check every 2 minutes
    const interval = setInterval(checkSessionStatus, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [status, checkSessionStatus]);

  // Auto-refresh when user is active (on mouse move, keyboard, etc)
  useEffect(() => {
    if (status !== 'authenticated') return;

    let lastRefresh = Date.now();
    const REFRESH_THROTTLE = 15 * 60 * 1000; // Refresh max once per 15 minutes

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRefresh > REFRESH_THROTTLE) {
        lastRefresh = now;
        refreshSession();
      }
    };

    // Add activity listeners
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [status, refreshSession]);

  // Validate session on mount and when coming back from background
  useEffect(() => {
    if (status !== 'authenticated') return;

    // Validate on mount
    validateSession();

    // Validate when tab becomes visible again
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        validateSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, validateSession]);

  return {
    sessionStatus,
    showExpiryWarning,
    refreshSession,
    validateSession,
    dismissWarning: () => setShowExpiryWarning(false),
  };
}
