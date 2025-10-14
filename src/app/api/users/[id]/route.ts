import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Schema for validating user update data
const updateUserSchema = z.object({
  officer_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
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

    const whereClause: any = { 
      id,
      isActive: true // Only show active users
    };

    // Role-based access control
    if (session.user.role === 'REVIEWER') {
      // Reviewers can only see vendor users
      whereClause.role = 'VENDOR';
    } else if (session.user.role === 'ADMIN') {
      // Admins cannot see SUPER_ADMIN users
      whereClause.NOT = { role: 'SUPER_ADMIN' };
    }
    // SUPER_ADMIN can see all users (no additional filter)

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
        role: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user (SUPER_ADMIN only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can update users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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

    // Handle password update if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
    }

    // Handle name fields based on role
    if (updateData.role === 'VENDOR') {
      updateData.vendor_name = validatedData.vendor_name ?? existingUser.vendor_name;
      updateData.officer_name = validatedData.vendor_name ?? existingUser.officer_name;
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
        created_at: true
      }
    });

    return NextResponse.json({
      user: updatedUser,
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
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can verify/reject users
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = verificationSchema.parse(body);

    // Check if user exists and is accessible by current role
    const whereClause: any = { 
      id,
      isActive: true // Only allow verification of active users
    };
    if (session.user.role === 'REVIEWER') {
      // Reviewers can only verify vendor users
      whereClause.role = 'VENDOR';
    } else if (session.user.role === 'ADMIN') {
      // Admins cannot verify SUPER_ADMIN users
      whereClause.NOT = { role: 'SUPER_ADMIN' };
    }

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
      updateData.verified_by = session.user.id;
      updateData.rejected_at = null;
      updateData.rejected_by = null;
      updateData.rejection_reason = null;
    } else if (validatedData.action === 'REJECT') {
      updateData.verification_status = 'REJECTED';
      updateData.rejected_at = new Date();
      updateData.rejected_by = session.user.id;
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

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
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