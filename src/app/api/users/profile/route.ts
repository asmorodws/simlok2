import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const commonSchema = z.object({
  phone_number: z.string().trim().min(1, "Nomor telepon wajib diisi"),
  address: z.string().trim().min(1, "Alamat wajib diisi"),
  email: z.string().trim().email("Format email tidak valid"),
});

const vendorSchema = commonSchema.extend({
  vendor_name: z.string().trim().min(1, "Nama vendor wajib diisi"),
});

const officerSchema = commonSchema.extend({
  officer_name: z.string().trim().min(1, "Nama petugas wajib diisi"),
});

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Pastikan session valid
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    // Ambil role dari DB agar pasti terbaru
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Validasi sesuai role
    let parsed:
      | z.infer<typeof vendorSchema>
      | z.infer<typeof officerSchema>;

    if (user.role === "VENDOR") {
      const res = vendorSchema.safeParse(body);
      if (!res.success) {
        const first = res.error.issues[0];
        return new NextResponse(first?.message ?? "Validasi gagal", {
          status: 400,
        });
      }
      parsed = res.data;

      // Update hanya field yang relevan untuk vendor
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          vendor_name: parsed.vendor_name,
          phone_number: parsed.phone_number,
          address: parsed.address,
          email: parsed.email,
          // officer_name tidak disentuh (tetap nilai lama)
        },
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          role: true,
        },
      });

      return NextResponse.json(updatedUser);
    } else {
      const res = officerSchema.safeParse(body);
      if (!res.success) {
        const first = res.error.issues[0];
        return new NextResponse(first?.message ?? "Validasi gagal", {
          status: 400,
        });
      }
      parsed = res.data;

      // Update hanya field yang relevan untuk non-vendor
      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          officer_name: parsed.officer_name,
          phone_number: parsed.phone_number,
          address: parsed.address,
          email: parsed.email,
          // vendor_name tidak disentuh (tetap nilai lama)
        },
        select: {
          id: true,
          email: true,
          officer_name: true,
          vendor_name: true,
          phone_number: true,
          address: true,
          role: true,
        },
      });

      return NextResponse.json(updatedUser);
    }
  } catch (error: any) {
    // Tangani kemungkinan constraint unique email
    if (error?.code === "P2002" && Array.isArray(error?.meta?.target) && error.meta.target.includes("email")) {
      return new NextResponse("Email sudah digunakan", { status: 409 });
    }

    console.error("[PROFILE_UPDATE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
