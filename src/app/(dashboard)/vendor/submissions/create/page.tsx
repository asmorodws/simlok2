import SubmissionForm from '@/components/submissions/SubmissionForm';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Buat Pengajuan Baru - SIMLOK',
};

export default function CreateSubmissionPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Buat Pengajuan Baru" titlePage="Vendor">
        <SubmissionForm />
      </SidebarLayout>
    </RoleGate>
  );
}
