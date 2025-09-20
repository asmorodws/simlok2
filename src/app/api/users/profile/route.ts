import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { officer_name, vendor_name, phone_number, address } = body;

    // Basic validation
    if (!officer_name?.trim()) {
      return new NextResponse("Officer name is required", { status: 400 });
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        officer_name,
        vendor_name: vendor_name || null,
        phone_number: phone_number || null,
        address: address || null,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[PROFILE_UPDATE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}