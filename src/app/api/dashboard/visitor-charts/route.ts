import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/security/auth';
import { prisma } from '@/lib/database';
import cache, { CacheKeys, CacheTTL } from '@/lib/cache';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check cache first
    const cachedData = cache.get(CacheKeys.VISITOR_CHARTS);
    if (cachedData) {
      return NextResponse.json(cachedData, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'private, max-age=300', // 5 minutes
        }
      });
    }

    // Get current date and date one year ago
    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Get submissions data for the last 12 months (Line Chart)
    const submissionsData = await prisma.submission.groupBy({
      by: ['created_at'],
      where: {
        created_at: {
          gte: oneYearAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get approved submissions data for the last 12 months
    const approvedData = await prisma.submission.groupBy({
      by: ['created_at'],
      where: {
        created_at: {
          gte: oneYearAgo,
        },
        approval_status: 'APPROVED',
      },
      _count: {
        id: true,
      },
    });

    // Get users data for the last 12 months (Bar Chart)
    const usersData = await prisma.user.groupBy({
      by: ['created_at'],
      where: {
        created_at: {
          gte: oneYearAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Group data by month
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();

    // Initialize arrays for 12 months
    const submissionsMonthly: number[] = new Array(12).fill(0);
    const approvedMonthly: number[] = new Array(12).fill(0);
    const usersMonthly: number[] = new Array(12).fill(0);
    const monthLabels: string[] = [];

    // Generate month labels starting from one year ago
    for (let i = 0; i < 12; i++) {
      const monthIndex = (currentMonth + i + 1) % 12;
      monthLabels.push(monthNames[monthIndex]!);
    }

    // Process submissions data
    submissionsData.forEach((item: any) => {
      const date = new Date(item.created_at);
      const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                        (date.getMonth() - oneYearAgo.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        submissionsMonthly[monthDiff] += item._count.id;
      }
    });

    // Process approved submissions data
    approvedData.forEach((item: any) => {
      const date = new Date(item.created_at);
      const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                        (date.getMonth() - oneYearAgo.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        approvedMonthly[monthDiff] += item._count.id;
      }
    });

    // Process users data - count NEW users per month, then calculate cumulative
    const newUsersMonthly: number[] = new Array(12).fill(0);
    usersData.forEach((item: any) => {
      const date = new Date(item.created_at);
      const monthDiff = (date.getFullYear() - oneYearAgo.getFullYear()) * 12 + 
                        (date.getMonth() - oneYearAgo.getMonth());
      if (monthDiff >= 0 && monthDiff < 12) {
        newUsersMonthly[monthDiff] += item._count.id;
      }
    });

    // Get total users created before the 12-month period (baseline)
    const baselineUsers = await prisma.user.count({
      where: {
        created_at: {
          lt: oneYearAgo,
        },
      },
    });

    // Calculate cumulative user count (akumulasi total user)
    let cumulativeCount = baselineUsers;
    for (let i = 0; i < 12; i++) {
      cumulativeCount += newUsersMonthly[i] || 0;
      usersMonthly[i] = cumulativeCount;
    }

    const chartData = {
      lineChart: {
        labels: monthLabels,
        series: [
          {
            name: 'Total Pengajuan',
            data: submissionsMonthly,
          },
          {
            name: 'Disetujui',
            data: approvedMonthly,
          },
        ],
      },
      barChart: {
        labels: monthLabels,
        series: [
          {
            name: 'Jumlah User',
            data: usersMonthly,
          },
        ],
      },
    };

    // Cache the response for 5 minutes
    cache.set(CacheKeys.VISITOR_CHARTS, chartData, CacheTTL.FIVE_MINUTES);

    return NextResponse.json(chartData, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'private, max-age=300', // 5 minutes
      }
    });
  } catch (error) {
    console.error('Error fetching visitor charts data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch charts data' },
      { status: 500 }
    );
  }
}
