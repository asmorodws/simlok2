import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Schema validasi untuk update user
const updateUserSchema = z.object({
  nama_petugas: z.string().min(1, "Nama petugas wajib diisi").optional(),
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.nativeEnum(Role).refine((val) => val === Role.VENDOR || val === Role.VERIFIER, {
    message: "Role harus VENDOR atau VERIFIER"
  }).optional(),
  alamat: z.string().optional(),
  no_telp: z.string().optional(),
  nama_vendor: z.string().optional(),
  verified_at: z.string().datetime().optional(),
});

// GET - Mengambil detail user berdasarkan ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cek apakah user adalah admin
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const user = await prisma.user.findUnique({
      where: { 
        id: resolvedParams.id,
        role: {
          in: [Role.VENDOR, Role.VERIFIER]
        }
      },
      select: {
        id: true,
        nama_petugas: true,
        email: true,
        role: true,
        alamat: true,
        no_telp: true,
        nama_vendor: true,
        date_created_at: true,
        verified_at: true,
        verified_by: true,
        foto_profil: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data user" },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cek apakah user adalah admin
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: validation.error.issues },
        { status: 400 }
      );
    }

    // Cek apakah user existe
    const existingUser = await prisma.user.findUnique({
      where: { 
        id: resolvedParams.id,
        role: {
          in: [Role.VENDOR, Role.VERIFIER]
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // Hash password jika ada
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Handle nama_vendor berdasarkan role
    if (updateData.role === Role.VERIFIER || updateData.role === Role.ADMIN) {
      updateData.nama_vendor = null;
    }

    // Parse verified_at jika ada
    if (updateData.verified_at) {
      updateData.verified_at = new Date(updateData.verified_at);
    }

    // Cek email unik jika email diubah
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "Email sudah digunakan" },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      select: {
        id: true,
        nama_petugas: true,
        email: true,
        role: true,
        alamat: true,
        no_telp: true,
        nama_vendor: true,
        date_created_at: true,
        verified_at: true,
        verified_by: true,
        foto_profil: true,
      }
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengupdate user" },
      { status: 500 }
    );
  }
}

// DELETE - Hapus user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cek apakah user adalah admin
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya admin yang dapat mengakses endpoint ini." },
        { status: 403 }
      );
    }

    const resolvedParams = await params;

    // Cek apakah user existe
    const existingUser = await prisma.user.findUnique({
      where: { 
        id: resolvedParams.id,
        role: {
          in: [Role.VENDOR, Role.VERIFIER]
        }
      }
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: resolvedParams.id }
    });

    return NextResponse.json(
      { message: "User berhasil dihapus" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghapus user" },
      { status: 500 }
    );
  }
}
