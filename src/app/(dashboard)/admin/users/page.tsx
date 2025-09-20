"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import UsersTable from "@/components/admin/UsersTable";
import UserModal from "@/components/admin/UserModal";
import DeleteModal from "@/components/admin/DeleteModal";
import UserVerificationModal from "@/components/admin/UserVerificationModal";
import { UserData } from "@/types/user";

export default function ManageUsersPage() {
  const { data: session, status } = useSession();
  
  // State untuk modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  
  // State untuk refresh tabel
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Loading state
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
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

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setModalMode("edit");
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleViewUser = (user: UserData) => {
    setSelectedUser(user);
    setIsVerificationModalOpen(true);
  };

  const handleModalClose = () => {
    setIsUserModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsVerificationModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUserUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUserRemove = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Manajemen User">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="bg-white shadow-sm rounded-xl border border-gray-200/70">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">
                    Manajemen User
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Kelola dan verifikasi user dalam sistem
                  </p>
                </div>
                <button
                  onClick={handleAddUser}
                  className="inline-flex items-center px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah User
                </button>
              </div>
            </div>

            {/* Table Section */}
            <div className="p-6">
              <UsersTable
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onView={handleViewUser}
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

          {/* User Verification Modal */}
          <UserVerificationModal
            isOpen={isVerificationModalOpen}
            onClose={handleModalClose}
            user={selectedUser}
            onUserUpdate={handleUserUpdate}
            onUserRemove={handleUserRemove}
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
