import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";
import { toJakartaISOString } from '@/lib/timezone';

// GET /api/users/profile - Get current user profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        address: true,
        phone_number: true,
        profile_photo: true,
        role: true,
        created_at: true,
        verified_at: true,
        verification_status: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formatted = {
      ...user,
      created_at: toJakartaISOString(user.created_at) || user.created_at,
      verified_at: toJakartaISOString(user.verified_at) || user.verified_at,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/users/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { officer_name, vendor_name, address, phone_number, email, position } = body;

    // Check if email is being changed and already exists
    if (email && email !== session.user.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Email sudah digunakan oleh user lain' }, { status: 400 });
      }
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        email: email || undefined,
        officer_name: officer_name || undefined,
        vendor_name: vendor_name || undefined,
        address: address || undefined,
        phone_number: phone_number || undefined,
        position: position !== undefined ? position : undefined, // Allow updating position for APPROVER
      },
      select: {
        id: true,
        email: true,
        officer_name: true,
        vendor_name: true,
        address: true,
        phone_number: true,
        profile_photo: true,
        role: true,
        position: true,
        created_at: true,
        verified_at: true,
        verification_status: true,
      }
    });

    const formattedUpdated = {
      ...updatedUser,
      created_at: toJakartaISOString(updatedUser.created_at) || updatedUser.created_at,
      verified_at: toJakartaISOString(updatedUser.verified_at) || updatedUser.verified_at,
    };

    return NextResponse.json(formattedUpdated);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}