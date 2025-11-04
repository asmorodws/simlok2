import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import { toJakartaISOString } from '@/lib/timezone';
import bcrypt from 'bcryptjs';

// Schema for validating user creation data
const createUserSchema = z.object({
  officer_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format'),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => {
  // Validate officer_name is required for all roles
  if (!data.officer_name || data.officer_name.trim() === '') {
    return false;
  }
  // Validate vendor_name is required for VENDOR role
  if (data.role === 'VENDOR' && (!data.vendor_name || data.vendor_name.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Officer name is required for all roles. Vendor name is required for VENDOR role.',
  path: ['officer_name', 'vendor_name'],
});

// GET /api/users - Get users (role-based filtering)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search');
    const status = searchParams.get('status'); // 'pending' | 'verified' | 'rejected'
    const role = searchParams.get('role');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const skip = (page - 1) * limit;

    const whereClause: any = {
      // Show all users (both active and inactive)
    };

    // Role-based filtering
    if (session.user.role === 'REVIEWER') {
      // Reviewers only see vendor users for verification
      whereClause.role = 'VENDOR';
    } else if (session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN') {
      // Admins can see all users except SUPER_ADMIN (unless they are SUPER_ADMIN)
      if (session.user.role !== 'SUPER_ADMIN') {
        whereClause.NOT = { role: 'SUPER_ADMIN' };
      }
      // Apply role filter if specified
      if (role && ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN'].includes(role)) {
        whereClause.role = role;
      }
    }

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
          role: true,
          isActive: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: whereClause })
    ]);

    // Get verification stats (useful for both reviewers and admins)
    const stats = {
      totalPending: await prisma.user.count({
        where: {
          isActive: true,
          ...(session.user.role === 'REVIEWER' ? { role: 'VENDOR' } : {}),
          verification_status: 'PENDING'
        }
      }),
      totalVerified: await prisma.user.count({
        where: {
          isActive: true,
          ...(session.user.role === 'REVIEWER' ? { role: 'VENDOR' } : {}),
          verification_status: 'VERIFIED'
        }
      }),
      totalRejected: await prisma.user.count({
        where: {
          isActive: true,
          ...(session.user.role === 'REVIEWER' ? { role: 'VENDOR' } : {}),
          verification_status: 'REJECTED'
        }
      }),
      totalUsers: await prisma.user.count({
        where: {
          isActive: true,
          ...(session.user.role === 'REVIEWER' ? { role: 'VENDOR' } : {})
        }
      }),
      todayRegistrations: await prisma.user.count({
        where: {
          isActive: true,
          ...(session.user.role === 'REVIEWER' ? { role: 'VENDOR' } : {}),
          created_at: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    };

    // Convert user date fields to Asia/Jakarta
    const formattedUsers = users.map(u => ({
      ...u,
      created_at: toJakartaISOString(u.created_at) || u.created_at,
      verified_at: toJakartaISOString(u.verified_at) || u.verified_at,
      rejected_at: toJakartaISOString(u.rejected_at) || u.rejected_at,
    }));

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/users - Create new user (SUPER_ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only SUPER_ADMIN can create users
    if (session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Super Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    // Custom validation based on role
    if (body.role === 'VENDOR') {
      // For VENDOR: both vendor_name and officer_name are required
      if (!body.vendor_name || !body.vendor_name.trim()) {
        return NextResponse.json({ error: 'Nama vendor wajib diisi untuk role VENDOR' }, { status: 400 });
      }
      if (!body.officer_name || !body.officer_name.trim()) {
        return NextResponse.json({ error: 'Nama petugas wajib diisi untuk role VENDOR' }, { status: 400 });
      }
    } else {
      // For all other roles (VERIFIER, REVIEWER, APPROVER, SUPER_ADMIN)
      if (!body.officer_name || !body.officer_name.trim()) {
        return NextResponse.json({ error: 'Nama petugas wajib diisi untuk role ini' }, { status: 400 });
      }
    }
    
    const validatedData = createUserSchema.parse(body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Prepare user data
    const userData: any = {
      email: validatedData.email,
      password: hashedPassword,
      role: validatedData.role,
      phone_number: validatedData.phone_number || null,
      address: validatedData.address || null,
      verification_status: 'VERIFIED', // Admin-created users are automatically verified
      verified_at: new Date(),
      verified_by: session.user.id,
    };

    // Handle name fields based on role
    if (validatedData.role === 'VENDOR') {
      // For VENDOR: both vendor_name (company) and officer_name (PIC) are required
      userData.vendor_name = validatedData.vendor_name;
      userData.officer_name = validatedData.officer_name;
    } else {
      // For VERIFIER, REVIEWER, APPROVER, SUPER_ADMIN: only officer_name is needed
      userData.officer_name = validatedData.officer_name;
      userData.vendor_name = null;
    }

    console.log('Creating user with data:', {
      email: userData.email,
      role: userData.role,
      officer_name: userData.officer_name,
      vendor_name: userData.vendor_name
    });

    // Create user
    const newUser = await prisma.user.create({
      data: userData,
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
        isActive: true,
        created_at: true
      }
    });

    const formattedNewUser = {
      ...newUser,
      created_at: toJakartaISOString(newUser.created_at) || newUser.created_at,
      verified_at: toJakartaISOString(newUser.verified_at) || newUser.verified_at,
    };

    return NextResponse.json({
      user: formattedNewUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}