import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';
import { z } from 'zod';
import { toJakartaISOString } from '@/lib/helpers/timezone';
import bcrypt from 'bcryptjs';
import type { RouteParams } from '@/types';
import { requireSessionWithRole, RoleGroups } from '@/lib/auth/roleHelpers';
import { buildUserRoleFilter } from '@/lib/database/queryHelpers';

// Schema for validating user update data
const updateUserSchema = z.object({
  officer_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  isActive: z.boolean().optional(),
  verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

// Schema for validating user verification data
const verificationSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  rejection_reason: z.string().optional(),
});

// GET /api/users/[id] - Get user details (REVIEWER, ADMIN, SUPER_ADMIN)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.USER_MANAGERS, 'Only reviewers and admins can view user details');
    if (userOrError instanceof NextResponse) return userOrError;

    // Build role-based filter and add id constraint
    const roleFilter = buildUserRoleFilter(userOrError.role);
    const whereClause: any = { 
      id,
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formattedUser = {
      ...user,
      created_at: toJakartaISOString(user.created_at) || user.created_at,
      verified_at: toJakartaISOString(user.verified_at) || user.verified_at,
      rejected_at: toJakartaISOString(user.rejected_at) || user.rejected_at,
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user (SUPER_ADMIN only, or REVIEWER for isActive field only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.USER_MANAGERS, 'Only reviewers and admins can update users');
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if this is only an isActive update
    const isOnlyActiveUpdate = Object.keys(body).length === 1 && body.hasOwnProperty('isActive');

    // Permission check:
    // - SUPER_ADMIN/ADMIN: Can update everything
    // - REVIEWER: Can update VENDOR users (full data edit or isActive only)
    if (userOrError.role === 'SUPER_ADMIN' || userOrError.role === 'ADMIN') {
      // SUPER_ADMIN and ADMIN can update everything
    } else if (userOrError.role === 'REVIEWER') {
      // REVIEWER can update VENDOR users
      const targetUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true }
      });
      
      if (!targetUser || targetUser.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Reviewers can only update vendor accounts' }, { status: 403 });
      }
      
      // REVIEWER cannot change role
      if (validatedData.role && validatedData.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Reviewers cannot change user role' }, { status: 403 });
      }
    } else {
      // No permission for other roles
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If this is only an isActive update, handle it separately
    if (isOnlyActiveUpdate && validatedData.isActive !== undefined) {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: validatedData.isActive },
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

      const formattedUpdatedUser = {
        ...updatedUser,
        created_at: toJakartaISOString(updatedUser.created_at) || updatedUser.created_at,
        verified_at: toJakartaISOString(updatedUser.verified_at) || updatedUser.verified_at,
        rejected_at: toJakartaISOString(updatedUser.rejected_at) || updatedUser.rejected_at,
      };

      return NextResponse.json({
        user: formattedUpdatedUser,
        message: 'Account status updated successfully'
      });
    }

    // Check if email is being changed and already exists
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: validatedData.email }
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      email: validatedData.email || existingUser.email,
      phone_number: validatedData.phone_number ?? existingUser.phone_number,
      address: validatedData.address ?? existingUser.address,
      role: validatedData.role || existingUser.role,
    };

    // Handle isActive field
    if (validatedData.isActive !== undefined) {
      updateData.isActive = validatedData.isActive;
    }

    // Handle verification_status field (SUPER_ADMIN and REVIEWER only)
    if (validatedData.verification_status) {
      if (userOrError.role === 'SUPER_ADMIN' || userOrError.role === 'REVIEWER') {
        updateData.verification_status = validatedData.verification_status;
        
        // Update timestamps based on status
        if (validatedData.verification_status === 'VERIFIED') {
          updateData.verified_at = new Date();
          updateData.rejected_at = null;
          updateData.rejection_reason = null;
        } else if (validatedData.verification_status === 'REJECTED') {
          updateData.rejected_at = new Date();
          updateData.verified_at = null;
        } else if (validatedData.verification_status === 'PENDING') {
          updateData.verified_at = null;
          updateData.rejected_at = null;
          updateData.rejection_reason = null;
        }
      }
    }

    // Handle password update if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    // Handle name fields based on role
    if (updateData.role === 'VENDOR') {
      updateData.vendor_name = validatedData.vendor_name ?? existingUser.vendor_name;
      updateData.officer_name = validatedData.officer_name ?? existingUser.officer_name;
    } else {
      updateData.officer_name = validatedData.officer_name ?? existingUser.officer_name;
      updateData.vendor_name = null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
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
        created_at: true
      }
    });

    console.log('PUT /api/users/[id] - Updated user:', {
      id: updatedUser.id,
      isActive: updatedUser.isActive
    });

    const formattedUpdatedUser2 = {
      ...updatedUser,
      created_at: toJakartaISOString(updatedUser.created_at) || updatedUser.created_at,
    };

    return NextResponse.json({
      user: formattedUpdatedUser2,
      message: 'User updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/users/[id] - Verify or reject user (REVIEWER, ADMIN, SUPER_ADMIN)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.USER_MANAGERS, 'Only reviewers and admins can verify/reject users');
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await request.json();
    const validatedData = verificationSchema.parse(body);

    // Check if user exists and is accessible by current role
    const roleFilter = buildUserRoleFilter(userOrError.role);
    const whereClause: any = { 
      id,
      ...roleFilter
      // Allow verification of both active and inactive users
    };

    const existingUser = await prisma.user.findFirst({
      where: whereClause
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare update data based on action
    const updateData: any = {};
    
    if (validatedData.action === 'VERIFY') {
      updateData.verification_status = 'VERIFIED';
      updateData.verified_at = new Date();
      updateData.verified_by = userOrError.id;
      updateData.rejected_at = null;
      updateData.rejected_by = null;
      updateData.rejection_reason = null;
    } else if (validatedData.action === 'REJECT') {
      updateData.verification_status = 'REJECTED';
      updateData.rejected_at = new Date();
      updateData.rejected_by = userOrError.id;
      updateData.rejection_reason = validatedData.rejection_reason || 'No reason provided';
      updateData.verified_at = null;
      updateData.verified_by = null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
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
    await import('@/server/events').then(({ notifyUserVerificationResult }) => 
      notifyUserVerificationResult(id, validatedData.action, validatedData.rejection_reason)
    );

    const formattedUpdatedUser3 = {
      ...updatedUser,
      verified_at: toJakartaISOString(updatedUser.verified_at) || updatedUser.verified_at,
      rejected_at: toJakartaISOString(updatedUser.rejected_at) || updatedUser.rejected_at,
    };

    return NextResponse.json({
      user: formattedUpdatedUser3,
      message: validatedData.action === 'VERIFY' 
        ? 'User verified successfully' 
        : 'User rejected successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error processing user verification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user (SUPER_ADMIN only)
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, RoleGroups.SUPER_ADMINS, 'Only super admins can delete users');
    if (userOrError instanceof NextResponse) return userOrError;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deleting yourself
    if (id === userOrError.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Hard delete user - submissions will remain with denormalized data
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}