import { Metadata } from "next";
import RoleGate from '@/components/security/RoleGate';
import SidebarLayout from '@/components/layout/SidebarLayout';
import VendorSubmissionsContent from '@/components/vendor/VendorSubmissionsContent';

export const metadata: Metadata = {
  title: "Daftar Pengajuan - Vendor SIMLOK",
  description: "Halaman untuk melihat dan mengelola daftar pengajuan vendor",
};

export default function VendorSubmissionsPage() {
  return (
    <RoleGate allowedRoles={["VENDOR"]}>
      <SidebarLayout title="Daftar Pengajuan" titlePage="Vendor">
        <VendorSubmissionsContent />
      </SidebarLayout>
    </RoleGate>
  );
}
