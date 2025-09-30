import { Metadata } from 'next';
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ApproverScanHistoryContent from '@/components/approver/ApproverScanHistoryContent';

export const metadata: Metadata = {
  title: 'Scan History - Approver Dashboard',
  description: 'Monitor submission scan activities by verifiers',
};

export default function ApproverScanHistoryPage() {
  return (
    <RoleGate allowedRoles={["APPROVER", "SUPER_ADMIN"]}>
      <SidebarLayout title="Approver Panel" titlePage="Scan History">
        <ApproverScanHistoryContent />
      </SidebarLayout>
    </RoleGate>
  );
}