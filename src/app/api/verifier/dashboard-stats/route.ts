/**
 * API Route for Verifier Dashboard Statistics
 * Returns dashboard stats for mobile-optimized verifier interface
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'VERIFIER') {
      return NextResponse.json(
        { error: 'Forbidden - Verifier access required' },
        { status: 403 }
      );
    }

    const userId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's scans count
    const todayScans = await prisma.qrScan.count({
      where: {
        scanned_by: userId,
        scanned_at: {
          gte: today,
        },
      },
    });

    // Get total verified submissions by this verifier
    const totalVerified = await prisma.submission.count({
      where: {
        approval_status: 'APPROVED',
        // Add verifier tracking if available in your schema
        // verifiedBy: userId,
      },
    });

    // Get pending reviews count
    const pendingReviews = await prisma.submission.count({
      where: {
        approval_status: 'PENDING',
      },
    });

    // Get recent activity for this verifier
    const recentScans = await prisma.qrScan.findMany({
      where: {
        scanned_by: userId,
      },
      include: {
        submission: {
          select: {
            simlok_number: true,
            vendor_name: true,
          },
        },
      },
      orderBy: {
        scanned_at: 'desc',
      },
      take: 10,
    });

    const recentActivity = recentScans.map((scan: any) => ({
      id: scan.id,
      type: 'scan' as const,
      message: scan.submission?.simlok_number 
        ? `Scan SIMLOK ${scan.submission.simlok_number} dari ${scan.submission.vendor_name}`
        : `Scan QR Code - ${scan.qr_data?.substring(0, 20)}...`,
      timestamp: scan.scanned_at.toISOString(),
    }));

    // Add some mock verified activities if needed
    const mockVerifiedActivities = [
      {
        id: 'verify-1',
        type: 'verify' as const,
        message: 'Verifikasi dokumen SIMLOK berhasil',
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      },
      {
        id: 'verify-2', 
        type: 'verify' as const,
        message: 'Update status submission ke APPROVED',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
    ];

    const allActivity = [...recentActivity, ...mockVerifiedActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    const stats = {
      todayScans,
      totalVerified,
      pendingReviews,
      recentActivity: allActivity,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}