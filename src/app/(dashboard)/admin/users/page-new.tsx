"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { PlusIcon } from "@heroicons/react/24/outline";

import RoleGate from "@/components/security/RoleGate";
import SidebarLayout from "@/components/layout/SidebarLayout";
import ListPageTemplate from "@/components/layout/ListPageTemplate";
import { 
  StatusBadge, 
  ActionButtonGroup,
  type ColumnDef 
} from "@/components/ui";

import UserModal from "@/components/admin/UserModal";
import DeleteModal from "@/components/admin/DeleteModal";
import UserVerificationModal from "@/components/admin/UserVerificationModal";
import { UserData } from "@/types/user";

export default function ManageUsersPageNew() {
  const { data: session, status } = useSession();
  
  // Data states
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  
  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  // Fetch users data
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchValue && { search: searchValue }),
        ...(activeFilter && { filter: activeFilter })
      });

      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.totalItems || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // All hooks must be called before any conditional returns
  useEffect(() => {
    // Only fetch if user is authenticated and is admin
    if (session && session.user.role === Role.ADMIN) {
      fetchUsers();
    }
  }, [currentPage, searchValue, activeFilter, session]);

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

  // Event handlers
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
    fetchUsers();
    handleModalClose();
  };

  const handleDeleteSuccess = () => {
    fetchUsers();
    handleModalClose();
  };

  const handleUserUpdate = () => {
    fetchUsers();
  };

  const handleUserRemove = () => {
    fetchUsers();
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short', 
      year: 'numeric'
    });
  };

  // Table columns configuration
  const columns: ColumnDef<UserData>[] = [
    {
      key: "name",
      header: "Nama",
      cell: (row) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.officer_name}
          </div>
          <div className="text-sm text-gray-500">
            {row.vendor_name}
          </div>
        </div>
      )
    },
    {
      key: "email", 
      header: "Email",
      accessor: "email"
    },
    {
      key: "role",
      header: "Role", 
      cell: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {row.role}
        </span>
      )
    },
    {
      key: "verified_at",
      header: "Status Verifikasi",
      cell: (row) => (
        <StatusBadge 
          status={row.verified_at ? "VERIFIED" : "UNVERIFIED"} 
        />
      )
    },
    {
      key: "created_at",
      header: "Tanggal Daftar",
      cell: (row) => (
        <span className="text-sm text-gray-500">
          {formatDate(row.created_at)}
        </span>
      )
    },
    {
      key: "actions",
      header: "Aksi",
      cell: (row) => (
        <ActionButtonGroup
          actions={[
            {
              action: "view",
              onClick: () => handleViewUser(row),
              tooltip: "Lihat detail"
            },
            {
              action: "edit", 
              onClick: () => handleEditUser(row),
              tooltip: "Edit user"
            },
            {
              action: "delete",
              onClick: () => handleDeleteUser(row),
              tooltip: "Hapus user"
            }
          ]}
        />
      )
    }
  ];

  // Filter configuration
  const filters = [
    { key: "verified", label: "Terverifikasi", value: "verified" },
    { key: "unverified", label: "Belum Terverifikasi", value: "unverified" },
    { key: "admin", label: "Admin", value: "admin" },
    { key: "vendor", label: "Vendor", value: "vendor" },
    { key: "reviewer", label: "Reviewer", value: "reviewer" },
    { key: "approver", label: "Approver", value: "approver" },
    { key: "verifier", label: "Verifier", value: "verifier" }
  ];

  // Pagination configuration
  const pagination = {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    onPageChange: setCurrentPage
  };

  return (
    <RoleGate allowedRoles={["ADMIN"]}>
      <SidebarLayout title="Admin Panel" titlePage="Manajemen User">
        <ListPageTemplate
          title="Manajemen User"
          description="Kelola dan verifikasi user dalam sistem"
          data={users}
          columns={columns}
          loading={loading}
          searchable={true}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder="Cari user..."
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          pagination={pagination}
          primaryAction={{
            label: "Tambah User",
            onClick: handleAddUser,
            icon: <PlusIcon className="w-4 h-4" />
          }}
          emptyStateTitle="Belum ada user"
          emptyStateDescription="Mulai dengan menambahkan user pertama ke dalam sistem"
          emptyStateAction={{
            label: "Tambah User Pertama",
            onClick: handleAddUser
          }}
        />

        {/* Modals */}
        <UserModal
          isOpen={isUserModalOpen}
          onClose={handleModalClose}
          onSave={handleSaveSuccess}
          user={selectedUser}
          mode={modalMode}
        />

        <UserVerificationModal
          isOpen={isVerificationModalOpen}
          onClose={handleModalClose}
          user={selectedUser}
          onUserUpdate={handleUserUpdate}
          onUserRemove={handleUserRemove}
        />

        <DeleteModal
          isOpen={isDeleteModalOpen}
          onClose={handleModalClose}
          onConfirm={handleDeleteSuccess}
          user={selectedUser}
        />
      </SidebarLayout>
    </RoleGate>
  );
}