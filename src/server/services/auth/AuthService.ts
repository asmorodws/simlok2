/**
 * Authentication Service - Business Logic Layer
 * 
 * Handles authentication and authorization operations including:
 * - User registration and validation
 * - Password management
 * - User verification workflows
 */

import bcrypt from 'bcryptjs';
import { userRepository } from '@/server/repositories/user/UserRepository';
import { notificationRepository } from '@/server/repositories/notification/NotificationRepository';
import { eventsPublisher } from '@/server/eventsPublisher';
import { revalidateTag } from 'next/cache';
import type { Role } from '@prisma/client';

export interface RegisterUserData {
  officer_name: string;
  email: string;
  password: string;
  vendor_name?: string;
  address?: string;
  phone_number?: string;
  role: Role;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  /**
   * Register new user with validation
   */
  async registerUser(data: RegisterUserData) {
    // Validate email uniqueness
    const existingUser = await userRepository.findByEmail(data.email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Validate vendor role requirements
    if (data.role === 'VENDOR' && !data.vendor_name) {
      throw new Error('Vendor name is required for vendor registration');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Create user
    const user = await userRepository.create({
      ...data,
      password: hashedPassword
    });

    // Send verification notification to admins for vendors
    if (data.role === 'VENDOR') {
      await this.notifyAdminsOfNewVendor(user.id, data.vendor_name!);

      // Publish event for real-time updates
      eventsPublisher.adminNewVendor({
        vendorId: user.id,
        createdAt: user.created_at.toISOString()
      });
    }

    // Invalidate admin cache
    revalidateTag('admin-stats');
    revalidateTag('users');

    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Verify user account (admin action)
   */
  async verifyUser(userId: string, verifiedBy: string) {
    // Validate admin permissions
    const admin = await userRepository.findById(verifiedBy);
    if (!admin || !['ADMIN', 'SUPER_ADMIN'].includes(admin.role)) {
      throw new Error('Only admins can verify users');
    }

    // Verify user
    const user = await userRepository.verifyUser(userId, verifiedBy);
    
    // Send verification success notification to user
    await this.notifyUserOfVerification(userId);

    // Invalidate caches
    revalidateTag('admin-stats');
    revalidateTag('users');

    return user;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    passwordData: ChangePasswordData
  ): Promise<void> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate current password
    const isCurrentPasswordValid = await this.validatePassword(
      passwordData.currentPassword,
      user.password
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(passwordData.newPassword, 12);

    // Update password
    await userRepository.update(userId, {
      password: hashedNewPassword
    });

    // Send password change confirmation notification
    await this.notifyPasswordChange(userId);
  }

  /**
   * Validate password against hash
   */
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get user profile with role-based filtering
   */
  async getUserProfile(userId: string, requestorId?: string, requestorRole?: Role) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check authorization
    const canViewFullProfile = 
      userId === requestorId || // Own profile
      ['ADMIN', 'SUPER_ADMIN'].includes(requestorRole || ''); // Admin access

    if (!canViewFullProfile) {
      // Return limited profile for unauthorized access
      const { password, email, phone_number, address, ...limitedProfile } = user;
      return limitedProfile;
    }

    // Return full profile (without password)
    const { password, ...fullProfile } = user;
    return fullProfile;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    updateData: Partial<Omit<RegisterUserData, 'password' | 'role'>>,
    requestorId: string,
    requestorRole: Role
  ) {
    // Check authorization
    const canUpdate = 
      userId === requestorId || // Own profile
      ['ADMIN', 'SUPER_ADMIN'].includes(requestorRole); // Admin access

    if (!canUpdate) {
      throw new Error('Unauthorized to update this profile');
    }

    const updatedUser = await userRepository.update(userId, updateData);

    // Invalidate cache
    revalidateTag('users');

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Get users list with pagination (admin only)
   */
  async getUsersList(
    requestorRole: Role,
    filters: {
      role?: Role;
      verified?: boolean;
      search?: string;
    } = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ) {
    // Check admin authorization
    if (!['ADMIN', 'SUPER_ADMIN', 'REVIEWER'].includes(requestorRole)) {
      throw new Error('Unauthorized to view users list');
    }

    return userRepository.findPaginated(filters, pagination);
  }

  /**
   * Delete user account (admin only)
   */
  async deleteUser(userId: string, requestorRole: Role): Promise<void> {
    // Check admin authorization
    if (!['ADMIN', 'SUPER_ADMIN'].includes(requestorRole)) {
      throw new Error('Only admins can delete users');
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deleting super admin
    if (user.role === 'SUPER_ADMIN') {
      throw new Error('Cannot delete super admin account');
    }

    await userRepository.delete(userId);

    // Invalidate caches
    revalidateTag('admin-stats');
    revalidateTag('users');
  }

  // Private helper methods

  private async notifyAdminsOfNewVendor(vendorId: string, vendorName: string) {
    const admins = await userRepository.findByRole('ADMIN', { verified: true });
    
    await notificationRepository.createBulkByScope('admin',
      admins.map(admin => ({
        vendor_id: admin.id,
        type: 'vendor_registration',
        title: 'New Vendor Registration',
        message: `New vendor "${vendorName}" has registered and needs verification`,
        data: JSON.stringify({ vendorId })
      }))
    );
  }

  private async notifyUserOfVerification(userId: string) {
    await notificationRepository.createBulkByScope('vendor', [{
      vendor_id: userId,
      type: 'account_verified',
      title: 'Account Verified',
      message: 'Your account has been verified. You can now create submissions.',
      data: JSON.stringify({ verified: true })
    }]);
  }

  private async notifyPasswordChange(userId: string) {
    await notificationRepository.createBulkByScope('vendor', [{
      vendor_id: userId,
      type: 'password_changed',
      title: 'Password Changed',
      message: 'Your password has been successfully changed.',
      data: JSON.stringify({ timestamp: new Date().toISOString() })
    }]);
  }
}

// Export singleton instance
export const authService = new AuthService();