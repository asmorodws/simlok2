import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';

// Schema for validating vendor approval
const approveVendorSchema = z.object({
  approve: z.boolean(),
});

// PATCH /api/reviewer/vendors/[id]/approve - Approve or reject vendor registration
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can approve vendors
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const body = await request.json();
    const { approve } = approveVendorSchema.parse(body);

    // Find the vendor user
    const vendor = await prisma.user.findUnique({
      where: { 
        id: params.id,
        role: 'VENDOR'
      },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        verified_at: true,
      }
    });

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
    }

    if (vendor.verified_at) {
      return NextResponse.json({ error: 'Vendor is already verified' }, { status: 400 });
    }

    if (approve) {
      // Approve the vendor
      const updatedVendor = await prisma.user.update({
        where: { id: params.id },
        data: {
          verified_at: new Date(),
          verified_by: session.user.id,
        },
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          verified_at: true,
        }
      });

      // Create notification for the vendor
      await prisma.notification.create({
        data: {
          scope: 'vendor',
          vendor_id: vendor.id,
          type: 'vendor_approved',
          title: 'Akun Vendor Disetujui',
          message: 'Selamat! Akun vendor Anda telah disetujui dan dapat mulai mengajukan Simlok.',
          data: JSON.stringify({
            vendorId: vendor.id,
            approvedBy: session.user.officer_name,
          }),
        }
      });

      return NextResponse.json({ 
        vendor: updatedVendor,
        message: 'Vendor approved successfully'
      });
    } else {
      // For rejection, we might want to delete the vendor or mark as rejected
      // For now, let's just create a notification
      await prisma.notification.create({
        data: {
          scope: 'vendor',
          vendor_id: vendor.id,
          type: 'vendor_rejected',
          title: 'Akun Vendor Ditolak',
          message: 'Maaf, akun vendor Anda ditolak. Silakan hubungi administrator untuk informasi lebih lanjut.',
          data: JSON.stringify({
            vendorId: vendor.id,
            rejectedBy: session.user.officer_name,
          }),
        }
      });

      return NextResponse.json({ 
        message: 'Vendor registration rejected'
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error processing vendor approval:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}