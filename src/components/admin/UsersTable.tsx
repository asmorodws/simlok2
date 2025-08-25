"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Role } from "@prisma/client";
import { UserData } from "@/types/user";
import { 

  MagnifyingGlassIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/button/Button";

interface UsersTableProps {
  onEdit: (user: UserData) => void;
  onDelete: (user: UserData) => void;
  onView: (user: UserData) => void;
  onAdd: () => void;
  refreshTrigger: number;
}

type SortField = keyof UserData;
type SortOrder = "asc" | "desc";

// Custom hook untuk debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function UsersTable({ onEdit, onDelete, onView, onAdd, refreshTrigger }: UsersTableProps) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [limit] = useState(10);
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [verificationFilter, setVerificationFilter] = useState<"all" | "pending" | "verified">("all");
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>("date_created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Ref untuk search input
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Debounced search term - akan menunggu 500ms setelah user berhenti mengetik
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        search: debouncedSearchTerm,
        sortBy: sortField,
        sortOrder: sortOrder,
        ...(roleFilter && { role: roleFilter }),
        verificationStatus: verificationFilter
      });

      const response = await fetch(`/api/users?${params}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Gagal mengambil data user");
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotalUsers(data.pagination.total);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchTerm, roleFilter, verificationFilter, sortField, sortOrder, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers, refreshTrigger]);

  // Kembalikan fokus ke search input setelah data reload
  useEffect(() => {
    if (!loading && isInputFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [loading, isInputFocused]);

  // Reset ke halaman 1 saat search term berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, roleFilter, sortField, sortOrder]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }, [sortField, sortOrder]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsInputFocused(true);
  }, []);

  const handleRoleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as Role | "");
  }, []);

  const paginationInfo = useMemo(() => ({
    currentPage,
    totalPages,
    totalUsers,
    limit,
    startItem: ((currentPage - 1) * limit) + 1,
    endItem: Math.min(currentPage * limit, totalUsers)
  }), [currentPage, totalPages, totalUsers, limit]);

  const getSortIcon = useCallback((field: SortField) => {
    if (sortField !== field) {
      return <ChevronUpDownIcon className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" 
      ? <ChevronUpIcon className="w-4 h-4 text-blue-500" />
      : <ChevronDownIcon className="w-4 h-4 text-blue-500" />;
  }, [sortField, sortOrder]);

  const formatDate = useCallback((dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short", 
      day: "numeric"
    });
  }, []);

  const getRoleBadge = useCallback((role: Role) => {
    const colors = {
      [Role.VENDOR]: "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400",
      [Role.VERIFIER]: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400",
      [Role.ADMIN]: "bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-400"
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role]}`}>
        {role}
      </span>
    );
  }, []);

  const getVerificationStatus = useCallback((verified_at?: string | Date | null) => {
    if (verified_at) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-400">
          Terverifikasi
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-warning-100 text-warning-800 dark:bg-warning-500/20 dark:text-warning-400">
        Menunggu Verifikasi
      </span>
    );
  }, []);

  // Memoize tabel content untuk hanya reload bagian ini
  const tableContent = useMemo(() => {
    if (error) {
      return (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{error}</div>
            <Button 
              onClick={fetchUsers}
              variant="destructive"
              size="sm"
              className="mt-2"
            >
              Coba Lagi
            </Button>
          </div>
        </div>
      );
    }

    if (users.length === 0 && !loading) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Tidak ada user yang ditemukan</div>
        </div>
      );
    }

    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  onClick={() => handleSort("nama_petugas")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Nama Petugas</span>
                    {getSortIcon("nama_petugas")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("email")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Email</span>
                    {getSortIcon("email")}
                  </div>
                </th>
                <th 
                  onClick={() => handleSort("role")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Role</span>
                    {getSortIcon("role")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vendor/Kontak
                </th>
                <th 
                  onClick={() => handleSort("date_created_at")}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                >
                  <div className="flex items-center space-x-1">
                    <span>Tgl Dibuat</span>
                    {getSortIcon("date_created_at")}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.nama_petugas}</div>
                    {user.alamat && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{user.alamat}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.nama_vendor || "-"}
                    </div>
                    {user.no_telp && (
                      <div className="text-sm text-gray-500">{user.no_telp}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(user.date_created_at)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getVerificationStatus(user.verified_at)}
                    {user.verified_by && (
                      <div className="text-xs text-gray-500 mt-1">
                        oleh: {user.verified_by}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        onClick={() => onView(user)}
                        variant="info"
                        size="sm"
                        className="px-3 py-1.5"
                      >
                        Lihat
                      </Button>
                      <Button
                        onClick={() => onEdit(user)}
                        variant="warning"
                        size="sm"
                        className="px-3 py-1.5"
                      >
                        Ubah
                      </Button>
                      <Button
                        onClick={() => onDelete(user)}
                        variant="destructive"
                        size="sm"
                        className="px-3 py-1.5"
                      >
                        Hapus
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {loading && (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
    );
  }, [users, loading, error, handleSort, getSortIcon, formatDate, getRoleBadge, getVerificationStatus, onEdit, onDelete, onView, fetchUsers]);

  return (
    <div className="space-y-4">
      {/* Header dengan Search dan Filter */}
      

      {/* Search dan Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari nama, email, vendor, atau nomor telepon..."
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={() => setIsInputFocused(false)}
            onFocus={() => setIsInputFocused(true)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={handleRoleFilterChange}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Semua Role</option>
          <option value={Role.VENDOR}>Vendor</option>
          <option value={Role.VERIFIER}>Verifier</option>
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value as "all" | "pending" | "verified")}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Semua Status</option>
          <option value="pending">Belum Verifikasi</option>
          <option value="verified">Sudah Verifikasi</option>
        </select>
      </div>

      {/* Tabel dengan loading overlay */}
      <div className="relative">
        {tableContent}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Menampilkan {paginationInfo.startItem} - {paginationInfo.endItem} dari {paginationInfo.totalUsers} user
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sebelumnya
            </button>
            
            <div className="flex items-center space-x-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 border text-sm font-medium rounded-md ${
                        currentPage === page
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return <span key={page} className="text-gray-500">...</span>;
                }
                return null;
              })}
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}