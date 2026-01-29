import { prisma } from '@/lib/database/singletons';
import { User_role as Role, VerificationStatus } from '@prisma/client';
import { toJakartaISOString } from '@/lib/helpers/timezone';
import bcrypt from 'bcryptjs';
import { buildUserRoleFilter } from '@/lib/database/queryHelpers';
import { notifyUserVerificationResult } from '@/lib/notification/events';

export interface UpdateUserInput {
  officer_name?: string | null | undefined;
  vendor_name?: string | null | undefined;
  email?: string | undefined;
  phone_number?: string | null | undefined;
  address?: string | null | undefined;
  role?: Role | undefined;
  password?: string | undefined;
  isActive?: boolean | undefined;
  verification_status?: VerificationStatus | undefined;
}

export interface VerifyUserInput {
  action: 'VERIFY' | 'REJECT';
  rejection_reason?: string | undefined;
}

interface SessionUser {
  id: string;
  role: Role;
}

export class UserService {
  /**
   * Get user by ID with role-based access control
   */
  async getUserById(userId: string, session: SessionUser) {
    // Build role-based filter and add id constraint
    const roleFilter = buildUserRoleFilter(session.role);
    const whereClause: any = { 
      id: userId,
      ...roleFilter
    };

    const user = await prisma.user.findFirst({
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
        isActive: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      ...user,
      created_at: toJakartaISOString(user.created_at) || user.created_at,
      verified_at: toJakartaISOString(user.verified_at) || user.verified_at,
      rejected_at: toJakartaISOString(user.rejected_at) || user.rejected_at,
    };
  }

  /**
   * Update user with role-based permission checks
   */
  async updateUser(userId: string, data: UpdateUserInput, session: SessionUser) {
    // Check if this is only an isActive update
    const isOnlyActiveUpdate = Object.keys(data).length === 1 && data.hasOwnProperty('isActive');

    // Permission check:
    // - SUPER_ADMIN: Can update everything
    // - REVIEWER: Can update VENDOR users only
    if (session.role === 'REVIEWER') {
      // REVIEWER can update VENDOR users
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
      });
      
      if (!targetUser || targetUser.role !== 'VENDOR') {
        throw new Error('Reviewers can only update vendor accounts');
      }
      
      // REVIEWER cannot change role
      if (data.role && data.role !== 'VENDOR') {
        throw new Error('Reviewers cannot change user role');
      }
    } else if (session.role !== 'SUPER_ADMIN') {
      // Only SUPER_ADMIN and REVIEWER have permission
      throw new Error('Access denied');
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // If this is only an isActive update, handle it separately
    if (isOnlyActiveUpdate && data.isActive !== undefined) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { isActive: data.isActive },
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

      return {
        user: {
          ...updatedUser,
          created_at: toJakartaISOString(updatedUser.created_at) || updatedUser.created_at,
          verified_at: toJakartaISOString(updatedUser.verified_at) || updatedUser.verified_at,
          rejected_at: toJakartaISOString(updatedUser.rejected_at) || updatedUser.rejected_at,
        },
        message: 'Account status updated successfully'
      };
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (emailExists) {
        throw new Error('Email already exists');
      }
    }

    // Prepare update data
    const updateData: any = {
      email: data.email || existingUser.email,
      phone_number: data.phone_number ?? existingUser.phone_number,
      address: data.address ?? existingUser.address,
      role: data.role || existingUser.role,
    };

    // Handle isActive field
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    // Handle verification_status field (SUPER_ADMIN and REVIEWER only)
    if (data.verification_status) {
      if (session.role === 'SUPER_ADMIN' || session.role === 'REVIEWER') {
        updateData.verification_status = data.verification_status;
        
        // Update timestamps based on status
        if (data.verification_status === 'VERIFIED') {
          updateData.verified_at = new Date();
          updateData.rejected_at = null;
          updateData.rejection_reason = null;
        } else if (data.verification_status === 'REJECTED') {
          updateData.rejected_at = new Date();
          updateData.verified_at = null;
        } else if (data.verification_status === 'PENDING') {
          updateData.verified_at = null;
          updateData.rejected_at = null;
          updateData.rejection_reason = null;
        }
      }
    }

    // Handle password update if provided
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    // Handle name fields based on role
    if (updateData.role === 'VENDOR') {
      updateData.vendor_name = data.vendor_name ?? existingUser.vendor_name;
      updateData.officer_name = data.officer_name ?? existingUser.officer_name;
    } else {
      updateData.officer_name = data.officer_name ?? existingUser.officer_name;
      updateData.vendor_name = null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
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
        created_at: true
      }
    });

    console.log('UserService.updateUser - Updated user:', {
      id: updatedUser.id,
      isActive: updatedUser.isActive
    });

    return {
      user: {
        ...updatedUser,
        created_at: toJakartaISOString(updatedUser.created_at) || updatedUser.created_at,
      },
      message: 'User updated successfully'
    };
  }

  /**
   * Verify or reject a user
   */
  async verifyUser(userId: string, data: VerifyUserInput, session: SessionUser) {
    // Check if user exists and is accessible by current role
    const roleFilter = buildUserRoleFilter(session.role);
    const whereClause: any = { 
      id: userId,
      ...roleFilter
      // Allow verification of both active and inactive users
    };

    const existingUser = await prisma.user.findFirst({
      where: whereClause
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Prepare update data based on action
    const updateData: any = {};
    
    if (data.action === 'VERIFY') {
      updateData.verification_status = 'VERIFIED';
      updateData.verified_at = new Date();
      updateData.verified_by = session.id;
      updateData.rejected_at = null;
      updateData.rejected_by = null;
      updateData.rejection_reason = null;
    } else if (data.action === 'REJECT') {
      updateData.verification_status = 'REJECTED';
      updateData.rejected_at = new Date();
      updateData.rejected_by = session.id;
      updateData.rejection_reason = data.rejection_reason || 'No reason provided';
      updateData.verified_at = null;
      updateData.verified_by = null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
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
      }
    });

    // Notify user of verification result
    await notifyUserVerificationResult(userId, data.action, data.rejection_reason);

    return {
      user: {
        ...updatedUser,
        verified_at: toJakartaISOString(updatedUser.verified_at) || updatedUser.verified_at,
        rejected_at: toJakartaISOString(updatedUser.rejected_at) || updatedUser.rejected_at,
      },
      message: data.action === 'VERIFY' 
        ? 'User verified successfully' 
        : 'User rejected successfully'
    };
  }

  /**
   * Delete a user (SUPER_ADMIN only)
   */
  async deleteUser(userId: string, session: SessionUser) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Prevent deleting yourself
    if (userId === session.id) {
      throw new Error('Cannot delete yourself');
    }

    // Hard delete user - submissions will remain with denormalized data
    await prisma.user.delete({ where: { id: userId } });

    return {
      message: 'User deleted successfully'
    };
  }
}

// Export singleton instance
export const userService = new UserService();
