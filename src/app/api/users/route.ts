import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';
import { UserService } from '@/services/UserService';

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
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Use UserService to get users with proper role-based filtering
    const result = await UserService.getUsers({
      requestorRole: session.user.role as any,
      page,
      limit,
      ...(search && { search }),
      ...(status && { verificationStatus: status as any }),
      ...(role && { role: role as any }),
      sortBy,
      sortOrder,
      includeStats: true,
    });

    return NextResponse.json(result);
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

    console.log('Creating user with data:', {
      email: validatedData.email,
      role: validatedData.role,
      officer_name: validatedData.officer_name,
      vendor_name: validatedData.vendor_name
    });

    // Use UserService to create user
    const newUser = await UserService.createUser({
      email: validatedData.email,
      password: validatedData.password,
      officer_name: validatedData.officer_name || null,
      vendor_name: validatedData.vendor_name || null,
      phone_number: validatedData.phone_number || null,
      address: validatedData.address || null,
      role: validatedData.role as any,
      verification_status: 'VERIFIED' as any,
      verified_by: session.user.id,
    });

    return NextResponse.json({
      user: newUser,
      message: 'User created successfully'
    }, { status: 201 });

  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    // Handle specific error messages from service
    if (error.message) {
      if (error.message.includes('Email already exists') || error.message.includes('already registered')) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
      if (error.message.includes('Only SUPER_ADMIN')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
    }
    
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}