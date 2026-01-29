import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { userService } from '@/services/UserService';

// Schema for validating user update data
const updateUserSchema = z.object({
  officer_name: z.string().optional().nullable(),
  vendor_name: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional(),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.enum(['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'SUPER_ADMIN']).optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  isActive: z.boolean().optional(),
  verification_status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
});

// Schema for validating user verification data
const verificationSchema = z.object({
  action: z.enum(['VERIFY', 'REJECT']),
  rejection_reason: z.string().optional(),
});

// GET /api/users/[id] - Get user details (REVIEWER, ADMIN, SUPER_ADMIN)
export const GET = withAuth(
  async (_request: NextRequest, session, params) => {
    const { id } = await params;
    const user = await userService.getUserById(id, session.user);
    return apiSuccess({ user });
  },
  { allowedRoles: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// PUT /api/users/[id] - Update user (SUPER_ADMIN only, or REVIEWER for isActive field only)
export const PUT = withAuth(
  async (request: NextRequest, session, params) => {
    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);
    
    const result = await userService.updateUser(id, validatedData, session.user);
    return apiSuccess(result);
  },
  { allowedRoles: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// PATCH /api/users/[id] - Verify or reject user (REVIEWER, ADMIN, SUPER_ADMIN)
export const PATCH = withAuth(
  async (request: NextRequest, session, params) => {
    const { id } = await params;
    const body = await request.json();
    const validatedData = verificationSchema.parse(body);
    
    const result = await userService.verifyUser(id, validatedData, session.user);
    return apiSuccess(result);
  },
  { allowedRoles: ['REVIEWER', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// DELETE /api/users/[id] - Delete user (SUPER_ADMIN only)
export const DELETE = withAuth(
  async (_request: NextRequest, session, params) => {
    const { id } = await params;
    const result = await userService.deleteUser(id, session.user);
    return apiSuccess(result);
  },
  { allowedRoles: ['SUPER_ADMIN'], requireAuth: true }
);
