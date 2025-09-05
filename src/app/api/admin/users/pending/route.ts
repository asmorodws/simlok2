import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pending vendors (users with role VENDOR and verified_at is null)
    const users = await prisma.user.findMany({
      where: {
        role: 'VENDOR',
        verified_at: null
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        officer_name: true,
        email: true,
        vendor_name: true,
        role: true,
        address: true,
        phone_number: true,
        created_at: true,
        verified_at: true,
        verified_by: true,
        profile_photo: true
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
