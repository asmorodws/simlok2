/**
 * User Service
 * Business logic for user management
 * Handles user CRUD, verification, authentication
 */

import { prisma } from '@/lib/singletons';
import { logger } from '@/lib/logger';
import { UserRole, VerificationStatus, isUserRole } from '@/types/enums';
import { toJakartaISOString } from '@/lib/timezone';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ==================== TYPE DEFINITIONS ====================

export interface VendorRegistrationData {
  officer_name: string;
  email: string;
  password: string;
  vendor_name: string;
  address: string;
  phone_number: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  officer_name?: string | null;
  vendor_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  role: UserRole;
  verification_status?: VerificationStatus;
  verified_by?: string | null;
}

export interface UpdateUserData {
  officer_name?: string;
  vendor_name?: string;
  phone_number?: string;
  address?: string;
  profile_photo?: string;
}

export interface UserFilters {
  role?: UserRole;
  requestorRole?: UserRole;
  verificationStatus?: VerificationStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeStats?: boolean;
}

export interface VerifyUserData {
  userId: string;
  verifiedBy: string;
  action: 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
}

export interface ChangePasswordData {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface UpdateUserAdminData {
  email?: string;
  password?: string;
  officer_name?: string;
  vendor_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  role?: UserRole;
  verification_status?: VerificationStatus;
  isActive?: boolean;
}

// ==================== USER SERVICE ====================

export class UserService {
  /**
   * Get users with role-based filtering
   */
  static async getUsers(filters: UserFilters) {
    try {
      const {
        role,
        requestorRole,
        verificationStatus,
        search,
        page = 1,
        limit = 10,
        sortBy = 'created_at',
        sortOrder = 'desc',
        includeStats = false,
      } = filters;

      const skip = (page - 1) * limit;
      const whereClause: any = {};

      // Role-based access control
      if (requestorRole === UserRole.REVIEWER) {
        // Reviewers only see vendor users
        whereClause.role = UserRole.VENDOR;
      } else if (requestorRole === UserRole.SUPER_ADMIN) {
        // Admins can see all users
        if (role && isUserRole(role)) {
          whereClause.role = role;
        }
      } else if (requestorRole) {
        // Other roles can see users (no SUPER_ADMIN restriction in this simple version)
        if (role && isUserRole(role)) {
          whereClause.role = role;
        }
      }

      // Verification status filter
      if (verificationStatus) {
        whereClause.verification_status = verificationStatus;
      }

      // Search filter
      if (search) {
        whereClause.OR = [
          { officer_name: { contains: search } },
          { vendor_name: { contains: search } },
          { email: { contains: search } }
        ];
      }

      // Query database
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            officer_name: true,
            vendor_name: true,
            address: true,
            phone_number: true,
            profile_photo: true,
            created_at: true,
            verified_at: true,
            verified_by: true,
            verification_status: true,
            rejected_at: true,
            rejected_by: true,
            rejection_reason: true,
            role: true,
            isActive: true,
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit,
        }),
        prisma.user.count({ where: whereClause })
      ]);

      // Format dates
      const formattedUsers = users.map(u => ({
        ...u,
        created_at: toJakartaISOString(u.created_at) || u.created_at,
        verified_at: toJakartaISOString(u.verified_at) || u.verified_at,
        rejected_at: toJakartaISOString(u.rejected_at) || u.rejected_at,
      }));

      const response: any = {
        users: formattedUsers,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };

      // Include statistics
      if (includeStats) {
        const statsWhere: any = {
          isActive: true,
          ...(requestorRole === UserRole.REVIEWER ? { role: UserRole.VENDOR } : {}),
        };

        const stats = {
          totalPending: await prisma.user.count({
            where: { ...statsWhere, verification_status: VerificationStatus.PENDING }
          }),
          totalVerified: await prisma.user.count({
            where: { ...statsWhere, verification_status: VerificationStatus.VERIFIED }
          }),
          totalRejected: await prisma.user.count({
            where: { ...statsWhere, verification_status: VerificationStatus.REJECTED }
          }),
          totalUsers: await prisma.user.count({ where: statsWhere }),
          todayRegistrations: await prisma.user.count({
            where: {
              ...statsWhere,
              created_at: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
            }
          })
        };

        response.stats = stats;
      }

      logger.info('UserService', 'Users retrieved', {
        requestorRole,
        total: totalCount,
        page,
      });

      return response;
    } catch (error) {
      logger.error('UserService', 'Error fetching users', error, filters);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(id: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          address: true,
          phone_number: true,
          profile_photo: true,
          created_at: true,
          verified_at: true,
          verified_by: true,
          verification_status: true,
          rejected_at: true,
          rejected_by: true,
          rejection_reason: true,
          role: true,
          isActive: true,
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('UserService', 'User retrieved', { userId: id });

      return {
        ...user,
        created_at: toJakartaISOString(user.created_at) || user.created_at,
        verified_at: toJakartaISOString(user.verified_at) || user.verified_at,
        rejected_at: toJakartaISOString(user.rejected_at) || user.rejected_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error fetching user', error, { id });
      throw error;
    }
  }

  /**
   * Create new user (SUPER_ADMIN only)
   */
  static async createUser(data: CreateUserData) {
    try {
      // Validate role-specific requirements
      if (data.role === UserRole.VENDOR) {
        if (!data.vendor_name || !data.vendor_name.trim()) {
          throw new Error('Nama vendor wajib diisi untuk role VENDOR');
        }
        if (!data.officer_name || !data.officer_name.trim()) {
          throw new Error('Nama petugas wajib diisi untuk role VENDOR');
        }
      } else {
        if (!data.officer_name || !data.officer_name.trim()) {
          throw new Error('Nama petugas wajib diisi untuk role ini');
        }
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Prepare user data
      const userData: any = {
        email: data.email,
        password: hashedPassword,
        role: data.role,
        phone_number: data.phone_number || null,
        address: data.address || null,
        verification_status: data.verification_status || VerificationStatus.VERIFIED,
        verified_at: data.verified_by ? new Date() : null,
        verified_by: data.verified_by || null,
      };

      // Handle name fields based on role
      if (data.role === UserRole.VENDOR) {
        userData.vendor_name = data.vendor_name;
        userData.officer_name = data.officer_name;
      } else {
        userData.officer_name = data.officer_name;
        userData.vendor_name = null;
      }

      // Create user
      const newUser = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          role: true,
          verified_at: true,
          verification_status: true,
          isActive: true,
          created_at: true
        }
      });

      logger.info('UserService', 'User created', {
        userId: newUser.id,
        email: newUser.email,
        role: newUser.role,
      });

      return {
        ...newUser,
        created_at: toJakartaISOString(newUser.created_at) || newUser.created_at,
        verified_at: toJakartaISOString(newUser.verified_at) || newUser.verified_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error creating user', error, {
        email: data.email,
        role: data.role,
      });
      throw error;
    }
  }

  /**
   * Update user profile
   */
  static async updateUser(id: string, data: UpdateUserData, requestorId?: string) {
    try {
      // Verify user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Access control: users can only update their own profile (unless admin)
      if (requestorId && requestorId !== id) {
        const requestor = await prisma.user.findUnique({
          where: { id: requestorId },
          select: { role: true }
        });

        if (requestor?.role !== UserRole.SUPER_ADMIN) {
          throw new Error('Access denied: You can only update your own profile');
        }
      }

      // Prepare update data (only include fields that are provided)
      const updateData: any = {};
      if (data.officer_name) updateData.officer_name = data.officer_name;
      if (data.vendor_name !== undefined) updateData.vendor_name = data.vendor_name;
      if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.profile_photo !== undefined) updateData.profile_photo = data.profile_photo;

      // Update user
      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          profile_photo: true,
          role: true,
          verification_status: true,
          created_at: true,
        }
      });

      logger.info('UserService', 'User updated', {
        userId: id,
        updatedBy: requestorId,
      });

      return {
        ...updated,
        created_at: toJakartaISOString(updated.created_at) || updated.created_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error updating user', error, { id, requestorId });
      throw error;
    }
  }

  /**
   * Verify or reject user (REVIEWER only)
   */
  static async verifyUser(data: VerifyUserData) {
    try {
      const { userId, verifiedBy, action, rejectionReason } = data;

      if (!['VERIFIED', 'REJECTED'].includes(action)) {
        throw new Error('Invalid verification action');
      }

      const updateData: any = {
        verification_status: action as VerificationStatus,
      };

      if (action === VerificationStatus.VERIFIED) {
        updateData.verified_at = new Date();
        updateData.verified_by = verifiedBy;
        updateData.rejected_at = null;
        updateData.rejected_by = null;
        updateData.rejection_reason = null;
      } else {
        updateData.rejected_at = new Date();
        updateData.rejected_by = verifiedBy;
        updateData.rejection_reason = rejectionReason || 'No reason provided';
        updateData.verified_at = null;
        updateData.verified_by = null;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          verification_status: true,
          verified_at: true,
          rejected_at: true,
          rejection_reason: true,
        }
      });

      logger.info('UserService', 'User verification updated', {
        userId,
        action,
        verifiedBy,
      });

      return {
        ...updated,
        verified_at: toJakartaISOString(updated.verified_at) || updated.verified_at,
        rejected_at: toJakartaISOString(updated.rejected_at) || updated.rejected_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error verifying user', error, data);
      throw error;
    }
  }

  /**
   * Change user password
   */
  static async changePassword(data: ChangePasswordData) {
    try {
      const { userId, currentPassword, newPassword } = data;

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, password: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      logger.info('UserService', 'Password changed', { userId });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      logger.error('UserService', 'Error changing password', error, {
        userId: data.userId,
      });
      throw error;
    }
  }

  /**
   * Delete user (SUPER_ADMIN only, soft delete)
   */
  static async deleteUser(id: string, deletedBy: string) {
    try {
      // Verify user exists and is not SUPER_ADMIN
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true }
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (user.role === UserRole.SUPER_ADMIN) {
        throw new Error('Cannot delete SUPER_ADMIN users');
      }

      // Soft delete by setting isActive to false
      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });

      logger.info('UserService', 'User deleted (soft)', {
        userId: id,
        deletedBy,
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      logger.error('UserService', 'Error deleting user', error, { id, deletedBy });
      throw error;
    }
  }

  /**
   * Activate user (SUPER_ADMIN only)
   */
  static async activateUser(id: string, activatedBy: string) {
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { isActive: true },
        select: {
          id: true,
          email: true,
          officer_name: true,
          isActive: true,
        }
      });

      logger.info('UserService', 'User activated', {
        userId: id,
        activatedBy,
      });

      return updated;
    } catch (error) {
      logger.error('UserService', 'Error activating user', error, { id, activatedBy });
      throw error;
    }
  }

  /**
   * Update user by admin (SUPER_ADMIN/ADMIN/REVIEWER)
   * Full update capabilities including role, verification status, isActive
   */
  static async updateUserAdmin(id: string, data: UpdateUserAdminData, updatedBy: string, updaterRole: UserRole) {
    try {
      // Verify user exists
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, email: true, vendor_name: true, officer_name: true }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check email uniqueness if being changed
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: data.email }
        });
        if (emailExists) {
          throw new Error('Email already exists');
        }
      }

      // Prepare update data
      const updateData: any = {};
      
      // Basic fields
      if (data.email) updateData.email = data.email;
      if (data.phone_number !== undefined) updateData.phone_number = data.phone_number;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.role) updateData.role = data.role;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Handle password if provided
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 12);
      }

      // Handle name fields based on role
      if (data.role === UserRole.VENDOR) {
        updateData.vendor_name = data.vendor_name ?? existingUser.vendor_name;
        updateData.officer_name = data.officer_name ?? existingUser.officer_name;
      } else {
        updateData.officer_name = data.officer_name ?? existingUser.officer_name;
        updateData.vendor_name = null;
      }

      // Handle verification_status and timestamps
      if (data.verification_status) {
        updateData.verification_status = data.verification_status;
        
        if (data.verification_status === VerificationStatus.VERIFIED) {
          updateData.verified_at = new Date();
          updateData.verified_by = updatedBy;
          updateData.rejected_at = null;
          updateData.rejected_by = null;
          updateData.rejection_reason = null;
        } else if (data.verification_status === VerificationStatus.REJECTED) {
          updateData.rejected_at = new Date();
          updateData.rejected_by = updatedBy;
          updateData.verified_at = null;
          updateData.verified_by = null;
        } else if (data.verification_status === VerificationStatus.PENDING) {
          updateData.verified_at = null;
          updateData.verified_by = null;
          updateData.rejected_at = null;
          updateData.rejected_by = null;
          updateData.rejection_reason = null;
        }
      }

      // Update user
      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          role: true,
          verification_status: true,
          isActive: true,
          created_at: true,
          verified_at: true,
          rejected_at: true,
          rejection_reason: true,
        }
      });

      logger.info('UserService', 'User updated by admin', {
        userId: id,
        updatedBy,
        updaterRole,
        changedFields: Object.keys(updateData),
      });

      return {
        ...updated,
        created_at: toJakartaISOString(updated.created_at) || updated.created_at,
        verified_at: toJakartaISOString(updated.verified_at) || updated.verified_at,
        rejected_at: toJakartaISOString(updated.rejected_at) || updated.rejected_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error updating user by admin', error, { id, updatedBy });
      throw error;
    }
  }

  /**
   * Get user statistics (SUPER_ADMIN only)
   */
  static async getUserStatistics() {
    try {
      const [
        totalUsers,
        vendorCount,
        verifierCount,
        reviewerCount,
        approverCount,
        adminCount,
        pendingVerification,
        verifiedUsers,
        rejectedUsers,
        activeUsers,
        inactiveUsers,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { role: UserRole.VENDOR } }),
        prisma.user.count({ where: { role: UserRole.VERIFIER } }),
        prisma.user.count({ where: { role: UserRole.REVIEWER } }),
        prisma.user.count({ where: { role: UserRole.APPROVER } }),
        prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
        prisma.user.count({ where: { verification_status: VerificationStatus.PENDING } }),
        prisma.user.count({ where: { verification_status: VerificationStatus.VERIFIED } }),
        prisma.user.count({ where: { verification_status: VerificationStatus.REJECTED } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isActive: false } }),
      ]);

      const statistics = {
        total: totalUsers,
        byRole: {
          vendor: vendorCount,
          verifier: verifierCount,
          reviewer: reviewerCount,
          approver: approverCount,
          admin: adminCount,
        },
        byVerificationStatus: {
          pending: pendingVerification,
          verified: verifiedUsers,
          rejected: rejectedUsers,
        },
        byActiveStatus: {
          active: activeUsers,
          inactive: inactiveUsers,
        }
      };

      logger.info('UserService', 'User statistics retrieved', { totalUsers });

      return statistics;
    } catch (error) {
      logger.error('UserService', 'Error fetching user statistics', error);
      throw error;
    }
  }

  /**
   * Register new vendor (public signup)
   * Validates input, checks duplicates, creates unverified vendor user
   */
  static async registerVendor(data: VendorRegistrationData) {
    try {
      // Validation schema
      const vendorRegistrationSchema = z.object({
        officer_name: z.string()
          .min(2, "Nama petugas minimal 2 karakter")
          .max(100, "Nama petugas maksimal 100 karakter")
          .trim(),
        email: z.string()
          .email("Format email tidak valid")
          .min(5, "Email terlalu pendek")
          .max(100, "Email terlalu panjang")
          .toLowerCase(),
        password: z.string()
          .min(8, "Password minimal 8 karakter")
          .max(100, "Password terlalu panjang")
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password harus mengandung huruf besar, huruf kecil, dan angka"),
        vendor_name: z.string()
          .min(2, "Nama vendor minimal 2 karakter")
          .max(150, "Nama vendor maksimal 150 karakter")
          .trim(),
        address: z.string()
          .min(10, "Alamat minimal 10 karakter")
          .max(500, "Alamat maksimal 500 karakter")
          .trim(),
        phone_number: z.string()
          .min(10, "Nomor telepon minimal 10 digit")
          .max(15, "Nomor telepon maksimal 15 digit")
          .regex(/^[0-9+\-\s]+$/, "Nomor telepon hanya boleh berisi angka, +, -, dan spasi")
          .trim(),
      });

      // Validate input
      const validationResult = vendorRegistrationSchema.safeParse(data);
      if (!validationResult.success) {
        const errors = validationResult.error.issues.map((err) => err.message).join(", ");
        throw new Error(errors);
      }

      const { officer_name, email, password, vendor_name, address, phone_number } = validationResult.data;

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({ 
        where: { email },
        select: { id: true, email: true }
      });
      
      if (existingUser) {
        throw new Error("Email sudah terdaftar");
      }

      // Check if vendor name already exists (case-insensitive)
      const existingVendor = await prisma.user.findFirst({
        where: { 
          vendor_name: {
            equals: vendor_name,
          }
        },
        select: { id: true, vendor_name: true }
      });

      if (existingVendor) {
        throw new Error("Nama vendor sudah terdaftar");
      }

      // Hash password with strong settings
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create new vendor user
      const newUser = await prisma.user.create({
        data: {
          officer_name,
          email,
          password: hashedPassword,
          vendor_name,
          address,
          phone_number,
          role: "VENDOR",
          verified_at: null, // Requires admin verification
        },
        select: {
          id: true,
          officer_name: true,
          email: true,
          vendor_name: true,
          role: true,
          created_at: true,
          verified_at: true,
          verification_status: true,
        }
      });

      logger.info('UserService', 'Vendor registered', {
        userId: newUser.id,
        email: newUser.email,
        vendor_name: newUser.vendor_name,
        timestamp: toJakartaISOString(new Date()),
      });

      return {
        ...newUser,
        created_at: toJakartaISOString(newUser.created_at) || newUser.created_at,
        verified_at: toJakartaISOString(newUser.verified_at) || newUser.verified_at,
      };
    } catch (error) {
      logger.error('UserService', 'Error registering vendor', error);
      throw error;
    }
  }
}

export default UserService;
