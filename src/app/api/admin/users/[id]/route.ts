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

    // Check if user exists and get submission count
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        _count: {
          select: {
            submissions: true
          }
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      // First, check if user has any submissions
      const submissions = await tx.submission.findMany({
        where: { user_id: id },
        select: { id: true, vendor_name: true, officer_name: true }
      });

      let deletedUser = null;

      if (submissions.length > 0) {
        console.log(`User ${id} has ${submissions.length} submissions. Creating placeholder user to preserve submissions.`);
        
        // Create a placeholder/deleted user to maintain referential integrity
        // This preserves all submission data while indicating the original user was deleted
        deletedUser = await tx.user.create({
          data: {
            email: `deleted-user-${id}@system.placeholder`,
            officer_name: `[DELETED USER] ${existingUser.email}`,
            vendor_name: existingUser.role === 'VENDOR' ? `[DELETED VENDOR]` : null,
            role: existingUser.role,
            password: 'placeholder-password-hash', // This account cannot be used for login
            verification_status: 'VERIFIED', // Set as verified to avoid issues
            verified_at: new Date(),
            isActive: false, // Mark as inactive
          }
        });

        // Update all submissions to point to the placeholder user
        await tx.submission.updateMany({
          where: { user_id: id },
          data: { user_id: deletedUser.id }
        });

        console.log(`Created placeholder user ${deletedUser.id} for ${submissions.length} submissions`);
      }

      // Handle other user relations that should be preserved
      // These can be set to null since they're optional fields
      await tx.submission.updateMany({
        where: { reviewed_by_id: id },
        data: { reviewed_by_id: null }
      });

      await tx.submission.updateMany({
        where: { approved_by: id },
        data: { approved_by: null }
      });

      await tx.submission.updateMany({
        where: { approved_by_final_id: id },
        data: { approved_by_final_id: null }
      });

      // Handle QR scans - update to use placeholder user if we created one
      const qrScans = await tx.qrScan.findMany({
        where: { scanned_by: id },
        select: { id: true }
      });

      if (qrScans.length > 0) {
        if (submissions.length > 0 && deletedUser) {
          // If we created a placeholder user, transfer QR scans to it
          await tx.qrScan.updateMany({
            where: { scanned_by: id },
            data: { scanned_by: deletedUser.id }
          });
          console.log(`Transferred ${qrScans.length} QR scans to placeholder user`);
        } else {
          // If no placeholder user was created, delete the QR scans
          await tx.qrScan.deleteMany({
            where: { scanned_by: id }
          });
          console.log(`Deleted ${qrScans.length} QR scans`);
        }
      }

      // Handle notification reads
      await tx.notificationRead.deleteMany({
        where: { 
          OR: [
            { user_id: id },
            { vendor_id: id }
          ]
        }
      });

      // Now safe to delete the original user
      await tx.user.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      message: 'User deleted successfully. Related submissions have been preserved.',
      preservedSubmissions: existingUser._count.submissions
    });

  } catch (error) {
    console.error('Error deleting user:', error);
    
    // Check if it's a foreign key constraint error
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete user due to related data constraints. Please contact system administrator.' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}