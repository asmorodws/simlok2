/**
 * REFACTORED DASHBOARD STATS HOOK
 * 
 * This custom hook demonstrates the clean separation between:
 * - UI logic (loading, error states)
 * - Business logic (data fetching, caching)
 * - Presentation logic (formatting, derived state)
 * 
 * Benefits:
 * - Reusable across multiple components
 * - Easy to test in isolation
 * - Type-safe with proper error handling
 * - Real-time updates via Socket.IO integration
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSocket } from '@/components/common/RealtimeUpdates';

export interface DashboardStats {
  // Common stats across all roles
  totalSubmissions: number;
  pendingSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  
  // Admin-specific stats
  totalVendors?: number;
  totalVerifiers?: number;
  totalAdmins?: number;
  pendingVerificationVendors?: number;
  pendingReview?: number;
  meetsRequirements?: number;
  notMeetsRequirements?: number;
  pendingApproval?: number;
  
  // Reviewer-specific stats
  todayReviewed?: number;
  
  // Approver-specific stats
  todayApproved?: number;
}

interface UseDashboardStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
  lastUpdated: Date | null;
  
  // Computed values
  totalProcessed: number;
  completionRate: number;
  pendingWorkload: number;
}

interface StatsUpdateEvent {
  scope: 'admin' | 'vendor' | 'reviewer' | 'approver';
  vendorId?: string;
  changes: Record<string, number | string>;
}

export const useDashboardStats = (): UseDashboardStatsResult => {
  const { data: session } = useSession();
  const socket = useSocket();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  /**
   * Determine the correct API endpoint based on user role
   */
  const getStatsEndpoint = useCallback(() => {
    if (!session?.user?.role) return null;
    
    switch (session.user.role) {
      case 'ADMIN':
      case 'SUPER_ADMIN':
        return '/api/admin/dashboard/stats';
      case 'VENDOR':
        return '/api/vendor/dashboard/stats';
      case 'REVIEWER':
        return '/api/reviewer/dashboard/stats';
      case 'APPROVER':
        return '/api/approver/dashboard/stats';
      default:
        return null;
    }
  }, [session?.user?.role]);

  /**
   * Fetch dashboard statistics from API
   */
  const fetchStats = useCallback(async (): Promise<void> => {
    const endpoint = getStatsEndpoint();
    if (!endpoint) {
      setError('Invalid user role or session');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Enable request deduplication in Next.js
        next: { 
          tags: [`${session?.user?.role?.toLowerCase()}-stats`],
          revalidate: 300 // 5 minutes
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle both direct data and wrapped success responses
      const statsData = data.data || data;
      
      setStats(statsData);
      setLastUpdated(new Date());
      
      console.log(`[useDashboardStats] Fetched stats for ${session?.user?.role}:`, statsData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      setError(errorMessage);
      console.error('[useDashboardStats] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [getStatsEndpoint, session?.user?.role]);

  /**
   * Manual refresh function
   */
  const refreshStats = useCallback(async (): Promise<void> => {
    console.log('[useDashboardStats] Manual refresh triggered');
    await fetchStats();
  }, [fetchStats]);

  /**
   * Handle real-time stats updates via Socket.IO
   */
  useEffect(() => {
    if (!socket || !session?.user) return;

    const handleStatsUpdate = (update: StatsUpdateEvent) => {
      console.log('[useDashboardStats] Real-time stats update:', update);
      
      // Check if this update is relevant for current user
      const isRelevant = 
        (update.scope === 'admin' && ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) ||
        (update.scope === 'vendor' && session.user.role === 'VENDOR' && update.vendorId === session.user.id) ||
        (update.scope === 'reviewer' && session.user.role === 'REVIEWER') ||
        (update.scope === 'approver' && session.user.role === 'APPROVER');

      if (isRelevant && stats) {
        // Apply incremental updates to avoid full refetch
        setStats(prevStats => {
          if (!prevStats) return prevStats;
          
          const updatedStats = { ...prevStats };
          
          // Apply changes from the update event
          Object.entries(update.changes).forEach(([key, value]) => {
            if (key in updatedStats && typeof value === 'number') {
              (updatedStats as any)[key] = value;
            }
          });
          
          return updatedStats;
        });
        
        setLastUpdated(new Date());
      }
    };

    // Subscribe to stats updates
    socket.on('stats:update', handleStatsUpdate);

    // Cleanup listener on unmount
    return () => {
      socket.off('stats:update', handleStatsUpdate);
    };
  }, [socket, session?.user, stats]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (session?.user?.role) {
      fetchStats();
    }
  }, [fetchStats, session?.user?.role]);

  /**
   * Computed values for enhanced UX
   */
  const computedValues = {
    totalProcessed: (stats?.approvedSubmissions || 0) + (stats?.rejectedSubmissions || 0),
    completionRate: stats?.totalSubmissions 
      ? Math.round(((stats.approvedSubmissions || 0) + (stats.rejectedSubmissions || 0)) / stats.totalSubmissions * 100)
      : 0,
    pendingWorkload: (stats?.pendingSubmissions || 0) + (stats?.pendingReview || 0) + (stats?.pendingApproval || 0)
  };

  return {
    stats,
    loading,
    error,
    refreshStats,
    lastUpdated,
    ...computedValues
  };
};

/**
 * Specialized hook for admin dashboard with additional utilities
 */
export const useAdminDashboardStats = () => {
  const result = useDashboardStats();
  
  const invalidateCache = useCallback(async () => {
    try {
      await fetch('/api/admin/dashboard/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'invalidate' })
      });
      
      // Refresh after cache invalidation
      await result.refreshStats();
    } catch (error) {
      console.error('[useAdminDashboardStats] Cache invalidation failed:', error);
    }
  }, [result.refreshStats]);

  return {
    ...result,
    invalidateCache
  };
};