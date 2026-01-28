import { Metadata } from 'next';
import { DashboardPageHelpers, createDashboardMetadata } from '@/lib/helpers/dashboardPageHelper';
import QRScanner from '@/components/features/scan/QRScanner';

export const metadata: Metadata = createDashboardMetadata(
  'Scan QR Code - Verifier',
  'Scan QR code SIMLOK untuk verifikasi'
);

export default function VerifierScanPage() {
  return DashboardPageHelpers.verifier(<QRScanner />);
}
