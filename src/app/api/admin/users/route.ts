import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';

// GET /api/reviewer/users - Get pending user verifications
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only REVIEWER or SUPER_ADMIN can access this endpoint
        if (!['REVIEWER', 'SUPER_ADMIN'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search');
        const status = searchParams.get('status'); // 'pending' | 'verified'
        const sortBy = searchParams.get('sortBy') || 'created_at';
        const sortOrder = searchParams.get('sortOrder') || 'desc';
        const skip = (page - 1) * limit;

        const whereClause: any = {
            NOT: {
                role: 'SUPER_ADMIN',
            },
        };

        // Filter by verification status
        if (status === 'pending') {
            whereClause.verification_status = 'PENDING';
        } else if (status === 'verified') {
            whereClause.verification_status = 'VERIFIED';
        } else if (status === 'rejected') {
            whereClause.verification_status = 'REJECTED';
        }

        // Search by name, vendor name, or email
        if (search) {
            whereClause.OR = [
                { officer_name: { contains: search } },
                { vendor_name: { contains: search } },
                { email: { contains: search } }
            ];
        }

        // Get users with pagination
        const [users, totalCount] = await Promise.all([
            prisma.user.findMany({
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
                },
                orderBy: { [sortBy]: sortOrder },
                skip,
                take: limit,
            }),
            prisma.user.count({ where: whereClause })
        ]);

        // Get verification stats
        const stats = {
            totalPending: await prisma.user.count({
                where: {
                    role: 'VENDOR',
                    verification_status: 'PENDING'
                }
            }),
            totalVerified: await prisma.user.count({
                where: {
                    role: 'VENDOR',
                    verification_status: 'VERIFIED'
                }
            }),
            totalRejected: await prisma.user.count({
                where: {
                    role: 'VENDOR',
                    verification_status: 'REJECTED'
                }
            }),
            totalUsers: await prisma.user.count({
                where: { role: 'VENDOR' }
            }),
            todayRegistrations: await prisma.user.count({
                where: {
                    role: 'VENDOR',
                    created_at: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            })
        };

        return NextResponse.json({
            users,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
            stats
        });
    } catch (error) {
        console.error('Error fetching users for verification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}