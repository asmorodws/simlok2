import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/useToast';
import { useRealTimeNotifications } from '@/hooks/useRealTimeNotifications';
import type { BaseSubmissionDetail } from '../SubmissionDetailShared';
import type { QrScan } from '@/types';

interface ScanHistory {
  scans: QrScan[];
  totalScans: number;
  lastScan?: QrScan;
  hasBeenScanned: boolean;
}

interface UseSubmissionDetailProps {
  submissionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function useSubmissionDetail({
  submissionId,
  isOpen,
  onClose,
}: UseSubmissionDetailProps) {
  const { showError } = useToast();
  const { eventSource, isConnected } = useRealTimeNotifications();
  
  const [submission, setSubmission] = useState<BaseSubmissionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistory | null>(null);
  const [loadingScanHistory, setLoadingScanHistory] = useState(false);

  const fetchSubmissionDetail = useCallback(async () => {
    if (!submissionId || !isOpen) return;

    try {
      setLoading(true);
      const controller = new AbortController();

      const response = await fetch(`/api/submissions/${submissionId}`, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (!response.ok) {
        if (response.status === 404) {
          showError('Pengajuan Tidak Ditemukan', 'Pengajuan sudah dihapus oleh vendor');
          onClose();
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        throw new Error('Gagal mengambil detail pengajuan');
      }

      const data = await response.json();

      if (!data.submission) {
        throw new Error('Data submission tidak ditemukan dalam response');
      }

      setSubmission(data.submission);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching submission:', err);
        showError('Error', err.message || 'Gagal memuat detail pengajuan');
      }
    } finally {
      setLoading(false);
    }
  }, [submissionId, isOpen, showError, onClose]);

  const fetchScanHistory = useCallback(async () => {
    if (!submissionId || !isOpen) return;

    try {
      setLoadingScanHistory(true);
      const response = await fetch(`/api/submissions/${submissionId}/scans`, { cache: 'no-store' });

      if (!response.ok) {
        if (response.status !== 404) {
          throw new Error('Failed to fetch scan history');
        }
        return;
      }

      const data: ScanHistory = await response.json();
      setScanHistory(data);
    } catch (err) {
      console.error('Error fetching scan history:', err);
      // Don't show error for scan history as it's not critical
    } finally {
      setLoadingScanHistory(false);
    }
  }, [submissionId, isOpen]);

  // Initial fetch when modal opens
  useEffect(() => {
    if (isOpen && submissionId) {
      fetchSubmissionDetail();
      fetchScanHistory();
    }
  }, [isOpen, submissionId]);

  // Listen to SSE notifications for real-time updates
  useEffect(() => {
    if (!eventSource || !submissionId) return;

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        const payload = message.data || {};

        let inner = payload.data ?? payload;
        if (typeof inner === 'string') {
          try {
            inner = JSON.parse(inner);
          } catch (err) {
            // ignore parse error
          }
        }

        const notifiedSubmissionId = inner?.submissionId || inner?.submission_id || payload?.submissionId || payload?.submission_id;
        if (notifiedSubmissionId && String(notifiedSubmissionId) === String(submissionId)) {
          // Refetch detail to show latest status
          fetchSubmissionDetail();
        }
      } catch (err) {
        // ignore malformed messages
      }
    };

    eventSource.addEventListener('message', handler as EventListener);

    return () => {
      try {
        eventSource.removeEventListener('message', handler as EventListener);
      } catch (e) {
        // ignore
      }
    };
  }, [eventSource, submissionId, fetchSubmissionDetail]);

  // Fallback polling when SSE is not available
  useEffect(() => {
    if (isConnected) return; // SSE available, no polling needed
    if (!isOpen || !submissionId) return;

    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        await fetchSubmissionDetail();
      } catch (e) {
        // ignore polling errors
      }
    };

    // Initial immediate fetch
    tick();

    const intervalId = window.setInterval(tick, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isConnected, isOpen, submissionId, fetchSubmissionDetail]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      const timeoutId = setTimeout(() => {
        setSubmission(null);
        setLoading(false);
        setScanHistory(null);
        setLoadingScanHistory(false);
      }, 50);

      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [isOpen]);

  return {
    submission,
    loading,
    scanHistory,
    loadingScanHistory,
    refetch: fetchSubmissionDetail,
  };
}
