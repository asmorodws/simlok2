import { Metadata } from 'next';
import DashboardPageTemplate from '@/components/templates/DashboardPageTemplate';
import QRScanner from '@/components/features/qr-scan/QRScanner';

export const metadata: Metadata = {
  title: 'Scan QR Code - Verifier - SIMLOK',
  description: 'Scan QR code SIMLOK untuk verifikasi',
};

export default function VerifierScanPage() {
  return (
    <DashboardPageTemplate
      allowedRoles={['VERIFIER']}
      sidebarTitle="Scan QR Code"
      titlePage="Verifier"
    >
      <QRScanner />
    </DashboardPageTemplate>
  );
}
