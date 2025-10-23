import SubmissionForm from '@/components/submissions/SubmissionForm';
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';

export default function CreateSubmissionPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Vendor Panel" titlePage="Buat Pengajuan Baru">
        <SubmissionForm />
      </SidebarLayout>
    </RoleGate>
  );
}
