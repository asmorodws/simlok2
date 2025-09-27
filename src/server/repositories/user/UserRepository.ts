/**
 * User Repository
 * 
 * Handles all database operations related to users and authentication.
 * Implements role-based queries and user verification logic.
 */

import { User, Prisma, Role } from '@prisma/client';
import { BaseRepository } from '../base/BaseRepository';

export interface UserStatistics {
  totalVendors: number;
  totalVerifiers: number;
  totalAdmins: number;
  totalReviewers: number;
  totalApprovers: number;
  totalSuperAdmins: number;
  pendingVerifications: number;
}

export interface UserFilters {
  role?: Role;
  verified?: boolean;
  search?: string;
}

export class UserRepository extends BaseRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput
> {
  protected getModel() {
    return this.prisma.user;
  }

  /**
   * Find user by email for authentication
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ 
      where: { email } 
    });
  }

  /**
   * Find all pending vendor verifications
   */
  async findPendingVendors(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: {
        role: 'VENDOR',
        verified_at: null
      },
      orderBy: {
        created_at: 'desc'
      }
    });
  }

  /**
   * Get comprehensive user statistics by role
   */
  async getStatsByRole(): Promise<UserStatistics> {
    const [
      totalVendors,
      totalVerifiers, 
      totalAdmins,
      totalReviewers,
      totalApprovers,
      totalSuperAdmins,
      pendingVerifications
    ] = await Promise.all([
      this.count({ role: 'VENDOR' }),
      this.count({ role: 'VERIFIER' }),
      this.count({ role: 'ADMIN' }),
      this.count({ role: 'REVIEWER' }),
      this.count({ role: 'APPROVER' }),
      this.count({ role: 'SUPER_ADMIN' }),
      this.count({ role: 'VENDOR', verified_at: null })
    ]);

    return {
      totalVendors,
      totalVerifiers,
      totalAdmins,
      totalReviewers,
      totalApprovers,
      totalSuperAdmins,
      pendingVerifications
    };
  }

  /**
   * Verify user account
   */
  async verifyUser(id: string, verifiedBy: string): Promise<User> {
    return this.update(id, {
      verified_at: new Date(),
      verified_by: verifiedBy
    });
  }

  /**
   * Find users with pagination and filters
   */
  async findPaginated(
    filters: UserFilters = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 }
  ) {
    const { role, verified, search } = filters;
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {};
    
    if (role) {
      where.role = role;
    }
    
    if (verified !== undefined) {
      where.verified_at = verified ? { not: null } : null;
    }

    if (search) {
      where.OR = [
        { officer_name: { contains: search } },
        { email: { contains: search } },
        { vendor_name: { contains: search } }
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          officer_name: true,
          email: true,
          vendor_name: true,
          role: true,
          verified_at: true,
          created_at: true,
          verified_by: true
        }
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Find users by role with select optimization
   */
  async findByRole(
    role: Role, 
    options: { verified?: boolean; select?: Prisma.UserSelect } = {}
  ): Promise<User[]> {
    const { verified, select } = options;
    
    const where: Prisma.UserWhereInput = { role };
    if (verified !== undefined) {
      where.verified_at = verified ? { not: null } : null;
    }

    return this.prisma.user.findMany({
      where,
      ...(select && { select }),
      orderBy: { created_at: 'desc' }
    });
  }

  /**
   * Batch update user roles (for admin operations)
   */
  async batchUpdateRoles(userIds: string[], role: Role): Promise<number> {
    const result = await this.prisma.user.updateMany({
      where: {
        id: { in: userIds }
      },
      data: { role }
    });

    return result.count;
  }
}

// Export singleton instance
export const userRepository = new UserRepository();