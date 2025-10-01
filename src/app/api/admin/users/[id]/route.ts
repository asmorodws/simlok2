import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

// Schema for validating user update data
const updateUserSchema = z.object({
  officer_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format'),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']),
  password: z.string().min(6).optional(),
});

// PUT /api/admin/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can access this endpoint
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Check if email is already taken by another user
    if (validatedData.email !== existingUser.email) {
      const emailExists = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          id: { not: id }
        }
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {
      email: validatedData.email,
      role: validatedData.role,
      phone_number: validatedData.phone_number || null,
      address: validatedData.address || null,
    };

    // Handle name fields based on role
    if (validatedData.role === 'VENDOR') {
      updateData.vendor_name = validatedData.vendor_name;
      updateData.officer_name = validatedData.vendor_name; // Keep officer_name as vendor_name for consistency
    } else {
      updateData.officer_name = validatedData.officer_name;
      updateData.vendor_name = null;
    }

    // Hash password if provided
    if (validatedData.password) {
      updateData.password = await bcrypt.hash(validatedData.password, 12);
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
        verified_at: true,
        verification_status: true,
        rejection_reason: true,
        rejected_at: true,
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

// DELETE /api/admin/users/[id] - Delete user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can access this endpoint
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        submissions: {
          select: { id: true }
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}