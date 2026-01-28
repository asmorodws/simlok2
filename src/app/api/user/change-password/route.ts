import { NextResponse } from "next/server";
import { prisma } from "@/lib/database/singletons";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth";
import { requireSessionWithRole } from '@/lib/auth/roleHelpers';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userOrError = requireSessionWithRole(session, ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN']);
    if (userOrError instanceof NextResponse) return userOrError;

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Get user from database
    const user = await prisma.user.findUnique({
      where: {
        id: userOrError.id,
      },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return new NextResponse("Kata sandi saat ini tidak valid", { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    await prisma.user.update({
      where: {
        id: userOrError.id,
      },
      data: {
        password: hashedPassword,
      },
    });

    return new NextResponse("Password updated successfully", { status: 200 });
  } catch (error) {
    console.error("[PASSWORD_CHANGE_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}