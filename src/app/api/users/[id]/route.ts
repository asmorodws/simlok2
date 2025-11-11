import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import { UserService } from '@/services/UserService';

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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/users/[id] - Get user details (REVIEWER, ADMIN, SUPER_ADMIN)
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use UserService to get user by ID
    const user = await UserService.getUserById(id);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Apply role-based filtering
    if (session.user.role === 'REVIEWER' && user.role !== 'VENDOR') {
      return NextResponse.json({ error: 'Reviewers can only view vendor users' }, { status: 403 });
    }
    
    if (session.user.role === 'ADMIN' && user.role === 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Admins cannot view SUPER_ADMIN users' }, { status: 403 });
    }

    return NextResponse.json({ user });
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if this is only an isActive update
    const isOnlyActiveUpdate = Object.keys(body).length === 1 && body.hasOwnProperty('isActive');

    // Permission check
    if (session.user.role === 'SUPER_ADMIN' || session.user.role === 'ADMIN') {
      // Full access
    } else if (session.user.role === 'REVIEWER') {
      // REVIEWER can update VENDOR users
      const targetUser = await UserService.getUserById(id);
      
      if (!targetUser || targetUser.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Reviewers can only update vendor accounts' }, { status: 403 });
      }
      
      // REVIEWER cannot change role
      if (validatedData.role && validatedData.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Reviewers cannot change user role' }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Use service layer for update (filter out undefined values)
    const updateData: Record<string, any> = {};
    if (validatedData.email) updateData.email = validatedData.email;
    if (validatedData.password) updateData.password = validatedData.password;
    if (validatedData.officer_name !== undefined) updateData.officer_name = validatedData.officer_name;
    if (validatedData.vendor_name !== undefined) updateData.vendor_name = validatedData.vendor_name;
    if (validatedData.phone_number !== undefined) updateData.phone_number = validatedData.phone_number;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.role) updateData.role = validatedData.role;
    if (validatedData.verification_status) updateData.verification_status = validatedData.verification_status;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const updatedUser = await UserService.updateUserAdmin(
      id,
      updateData as any,
      session.user.id,
      session.user.role as any
    );

    console.log('PUT /api/users/[id] - Updated user:', {
      id: updatedUser.id,
      isActive: updatedUser.isActive
    });

    return NextResponse.json({
      user: updatedUser,
      message: isOnlyActiveUpdate ? 'Account status updated successfully' : 'User updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    if ((error as Error).message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if ((error as Error).message === 'Email already exists') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can verify/reject users
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = verificationSchema.parse(body);

    // Check user role access
    if (session.user.role === 'REVIEWER') {
      const targetUser = await UserService.getUserById(id);
      if (!targetUser || targetUser.role !== 'VENDOR') {
        return NextResponse.json({ error: 'Reviewers can only verify vendor users' }, { status: 404 });
      }
    } else if (session.user.role === 'ADMIN') {
      const targetUser = await UserService.getUserById(id);
      if (!targetUser || targetUser.role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Admins cannot verify SUPER_ADMIN users' }, { status: 404 });
      }
    }

    // Use service layer for verification
    const updatedUser = await UserService.verifyUser({
      userId: id,
      verifiedBy: session.user.id,
      action: validatedData.action === 'VERIFY' ? 'VERIFIED' : 'REJECTED',
      ...(validatedData.rejection_reason && { rejectionReason: validatedData.rejection_reason })
    });

    // Notify user of verification result
    await import('@/server/events').then(({ notifyUserVerificationResult }) => 
      notifyUserVerificationResult(id, validatedData.action, validatedData.rejection_reason)
    );

    return NextResponse.json({
      user: updatedUser,
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

    if ((error as Error).message === 'User not found') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can delete users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (id === session.user.id) {
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