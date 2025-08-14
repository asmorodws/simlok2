"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import RoleGate from "@/components/RoleGate";
import SidebarLayout from "@/components/SidebarLayout";
import UsersTable from "@/components/admin/UsersTable";
import UserModal from "@/components/admin/UserModal";
import DeleteModal from "@/components/admin/DeleteModal";

interface User {
  id: string;
  nama_petugas: string;
  email: string;
  role: Role;
  alamat?: string;
  no_telp?: string;
  nama_vendor?: string;
  date_created_at: string;
  verified_at?: string;
  verified_by?: string;
  foto_profil?: string;
}

export default function ManageUsersPage() {
  const { data: session, status } = useSession();
  
  // State untuk modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  
  // State untuk refresh tabel
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirect if not authenticated or not admin
  if (!session || session.user.role !== Role.ADMIN) {
    redirect("/login");
  }

  const handleAddUser = () => {
    setSelectedUser(null);
    setModalMode("add");
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setModalMode("edit");
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleModalClose = () => {
    setIsUserModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Kelola User">
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <UsersTable
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onAdd={handleAddUser}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>

          {/* User Modal (Add/Edit) */}
          <UserModal
            isOpen={isUserModalOpen}
            onClose={handleModalClose}
            onSave={handleSaveSuccess}
            user={selectedUser}
            mode={modalMode}
          />

          {/* Delete Modal */}
          <DeleteModal
            isOpen={isDeleteModalOpen}
            onClose={handleModalClose}
            onConfirm={handleDeleteSuccess}
            user={selectedUser}
          />
        </div>
      </SidebarLayout>
    </RoleGate>
  );
}
