import { Metadata } from 'next';
import { DashboardPageHelpers, createDashboardMetadata } from '@/lib/helpers/dashboardPageHelper';
import VerifierScanHistory from '@/components/features/scan/history/VerifierScanHistory';

export const metadata: Metadata = createDashboardMetadata(
  'Riwayat Scan - Verifier',
  'Riwayat scan QR code SIMLOK oleh verifier'
);

export default function VerifierHistoryPage() {
  return DashboardPageHelpers.verifier(<VerifierScanHistory />);
}