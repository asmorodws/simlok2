// app/api/users/[id]/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/lib/auth";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    const { action } = await request.json(); // "approve" or "reject"

    // Check session
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let updatedUser;

    if (action === "approve") {
      // Approve user
      updatedUser = await prisma.user.update({
        where: { id },
        data: {
          verified_at: new Date(),
          verified_by: session.user.id,
        },
        select: {
          id: true,
          nama_petugas: true,
          email: true,
          role: true,
          nama_vendor: true,
          verified_at: true,
          date_created_at: true,
        },
      });
    } else if (action === "reject") {
      // For now, we'll just delete the user. You might want to keep them with a "rejected" status
      await prisma.user.delete({
        where: { id },
      });
      
      return NextResponse.json({ 
        message: "User rejected and removed from system",
        success: true 
      });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      message: `User ${action === "approve" ? "approved" : "rejected"} successfully`,
      user: updatedUser,
      success: true
    });

  } catch (error) {
    console.error("Error in user verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
