import { Metadata } from 'next';
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ReviewerScanHistoryContent from '@/components/reviewer/ReviewerScanHistoryContent';

export const metadata: Metadata = {
  title: 'Scan History - Reviewer Dashboard',
  description: 'Monitor submission scan activities by verifiers',
};

export default function ReviewerScanHistoryPage() {
  return (
    <RoleGate allowedRoles={["REVIEWER", "ADMIN", "SUPER_ADMIN"]}>
      <SidebarLayout title="Reviewer Panel" titlePage="Scan History">
        <ReviewerScanHistoryContent />
      </SidebarLayout>
    </RoleGate>
  );
}