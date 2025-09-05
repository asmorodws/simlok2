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

    // Get recent submissions (latest 10)
    const submissions = await prisma.submission.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true
          }
        },
        approved_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error fetching recent submissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
