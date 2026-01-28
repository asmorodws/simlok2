import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth';
import { prisma } from '@/lib/database/singletons';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/users/[id]/role - Change user role
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized. Only SUPER_ADMIN can change roles' }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await request.json();
    const { role } = body;

    const validRoles = ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent changing own role
    if (id === session.user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, officer_name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        officer_name: true,
        role: true,
        verification_status: true,
      },
    });

    // Create notification for the user
    await prisma.notification.create({
      data: {
        vendor_id: role === 'VENDOR' ? user.id : null,
        scope: role === 'VENDOR' ? 'vendor' : 'admin',
        type: 'SYSTEM',
        title: 'Role Changed',
        message: `Your role has been changed from ${user.role} to ${role} by ${session.user.officer_name || session.user.email}.`,
        data: JSON.stringify({
          old_role: user.role,
          new_role: role,
          changed_by: session.user.id,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User role updated successfully',
    });
  } catch (error) {
    console.error('Change role error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to change user role' },
      { status: 500 }
    );
  }
}
