import { Metadata } from 'next';
import { DashboardPageHelpers, createDashboardMetadata } from '@/lib/helpers/dashboardPageHelper';
import UnifiedSubmissionForm from '@/components/features/submission/UnifiedSubmissionForm';

export const metadata: Metadata = createDashboardMetadata(
  'Buat Pengajuan Baru',
  'Halaman untuk membuat pengajuan baru'
);

export default function CreateSubmissionPage() {
  return DashboardPageHelpers.vendor(<UnifiedSubmissionForm mode="create" />);
}
