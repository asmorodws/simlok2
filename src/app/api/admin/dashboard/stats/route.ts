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

    // Get admin statistics
    const [
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalUsers,
      pendingUsers,
      totalVendors,
      totalVerifiers
    ] = await Promise.all([
      prisma.submission.count(),
      prisma.submission.count({ where: { approval_status: 'PENDING' } }),
      prisma.submission.count({ where: { approval_status: 'APPROVED' } }),
      prisma.submission.count({ where: { approval_status: 'REJECTED' } }),
      prisma.user.count({ where: { role: { in: ['VENDOR', 'VERIFIER'] } } }),
      prisma.user.count({ where: { role: 'VENDOR', verified_at: null } }),
      prisma.user.count({ where: { role: 'VENDOR' } }),
      prisma.user.count({ where: { role: 'VERIFIER' } })
    ]);

    const stats = {
      totalSubmissions,
      pendingSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalUsers,
      pendingUsers,
      totalVendors,
      totalVerifiers,
      pendingVerificationVendors: pendingUsers,
      pendingVerificationSubmissions: pendingSubmissions
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
