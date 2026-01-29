import { Metadata } from 'next';
import { DashboardPageHelpers, createDashboardMetadata } from '@/lib/helpers/dashboardPageHelper';
import ScanHistoryContent from '@/components/features/qr-scan/ScanHistoryContent';

export const metadata: Metadata = createDashboardMetadata(
  'Riwayat Scan - Reviewer',
  'Monitor aktivitas scan pengajuan oleh verifier'
);

export default function ReviewerScanHistoryPage() {
  return DashboardPageHelpers.reviewer(<ScanHistoryContent role="REVIEWER" />);
}