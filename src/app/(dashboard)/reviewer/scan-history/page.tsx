import { Metadata } from 'next';
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ReviewerScanHistoryContent from '@/components/reviewer/ReviewerScanHistoryContent';

export const metadata: Metadata = {
  title: 'Riwayat Scan - Reviewer SIMLOK',
  description: 'Monitor aktivitas scan pengajuan oleh verifier',
};

export default function ReviewerScanHistoryPage() {
  return (
    <RoleGate allowedRoles={["REVIEWER" , "SUPER_ADMIN"]}>
      <SidebarLayout title="Riwayat Scan" titlePage="Reviewer">
        <ReviewerScanHistoryContent />
      </SidebarLayout>
    </RoleGate>
  );
}