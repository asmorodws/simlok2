import { Metadata } from 'next';
import { DashboardPageHelpers, createDashboardMetadata } from '@/lib/helpers/dashboardPageHelper';
import ScanHistoryContent from '@/components/features/scan/history/ScanHistoryContent';

export const metadata: Metadata = createDashboardMetadata(
  'Riwayat Scan - Approver',
  'Monitor aktivitas scan pengajuan oleh verifier'
);

export default function ApproverScanHistoryPage() {
  return DashboardPageHelpers.approver(<ScanHistoryContent role="APPROVER" />);
}