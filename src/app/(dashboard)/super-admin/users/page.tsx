"use client";

import { useState, useEffect } from "react";
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
  
  // State untuk tab dan filter
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");
  
  // Effect untuk mengambil tab dari URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending') {
      setActiveTab('pending');
    }
  }, []);
  
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

  // Redirect if not authenticated or not super admin
  if (!session || session.user.role !== Role.SUPER_ADMIN) {
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

  const handleTabChange = (tab: "all" | "pending") => {
    setActiveTab(tab);
    // Update URL with tab parameter without reloading the page
    const url = new URL(window.location.href);
    if (tab === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.pushState({}, "", url.toString());
  };

  return (
    <RoleGate allowedRoles={["SUPER_ADMIN"]}>
      <SidebarLayout title="Super Admin Panel" titlePage="Manajemen User">
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
              {/* Tabs Navigation */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => handleTabChange("all")}
                    className={`${
                      activeTab === "all"
                        ? "border-brand-500 text-brand-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    Semua User
                  </button>
                  <button
                    onClick={() => handleTabChange("pending")}
                    className={`${
                      activeTab === "pending"
                        ? "border-brand-500 text-brand-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                  >
                    Vendor Menunggu Verifikasi
                    <span className="ml-2 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full px-2.5 py-0.5">
                      Butuh Persetujuan
                    </span>
                  </button>
                </nav>
              </div>
              
              <UsersTable
                onEdit={handleEditUser}
                onDelete={handleDeleteUser}
                onView={handleViewUser}
                onAdd={handleAddUser}
                refreshTrigger={refreshTrigger}
                filterByVerification={activeTab === "pending" ? true : null}
                filterByRole={activeTab === "pending" ? Role.VENDOR : null}
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
