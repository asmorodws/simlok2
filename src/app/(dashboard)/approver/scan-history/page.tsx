import { Metadata } from 'next';
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ApproverScanHistoryContent from '@/components/approver/ApproverScanHistoryContent';

export const metadata: Metadata = {
  title: 'Riwayat Scan - Approver SIMLOK',
  description: 'Monitor aktivitas scan pengajuan oleh verifier',
};

export default function ApproverScanHistoryPage() {
  return (
    <RoleGate allowedRoles={["APPROVER", "SUPER_ADMIN"]}>
      <SidebarLayout title="Riwayat Scan" titlePage="Approver">
        <ApproverScanHistoryContent />
      </SidebarLayout>
    </RoleGate>
  );
}