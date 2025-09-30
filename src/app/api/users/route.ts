import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/singletons";
import { User_role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";

const userSchema = z.object({
  officer_name: z.string().min(1, "Nama petugas wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter").optional(),
  role: z.nativeEnum(User_role),
  address: z.string().optional(),
  phone_number: z.string().optional(),
  vendor_name: z.string().optional(),
});

// GET - Mengambil daftar user dengan pagination, search, dan sort
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cek apakah user adalah super admin
    if (!session || session.user.role !== User_role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya super admin yang dapat mengakses endpoint ini." },
        { status: 403 }
      );
    }

    // Get search params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "created_at";
    const sortOrder = searchParams.get("sortOrder") || "desc";
    const role = searchParams.get("role") || "";
    const verificationStatus = searchParams.get("verificationStatus") || ""; // "pending", "verified", "all"

    console.log("API received params:", { 
      page, 
      limit, 
      search, 
      sortBy, 
      sortOrder, 
      role, 
      verificationStatus 
    });

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Filter by role if specified
    if (role && (role === User_role.VENDOR || role === User_role.VERIFIER)) {
      where.role = role;
    }

    // Filter by verification status
    if (verificationStatus === "pending") {
      where.verified_at = null;
      console.log("Filtering for pending verification (verified_at is null)");
    } else if (verificationStatus === "verified") {
      where.verified_at = { not: null };
      console.log("Filtering for verified users (verified_at is not null)");
    } else {
      console.log("No verification filter applied (showing all)");
    }
    // "all" shows both pending and verified

    console.log("Final query where clause:", JSON.stringify(where, null, 2));

    // Search functionality
    if (search) {
      where.OR = [
        { officer_name: { contains: search } },
        { email: { contains: search } },
        { vendor_name: { contains: search } },
        { phone_number: { contains: search } },
      ];
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with pagination and sorting
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder as "asc" | "desc"
      },
      select: {
        id: true,
        officer_name: true,
        email: true,
        role: true,
        address: true,
        phone_number: true,
        vendor_name: true,
        created_at: true,
        verified_at: true,
        verified_by: true,
        profile_photo: true,
      }
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat mengambil data user" },
      { status: 500 }
    );
  }
}

// POST - Membuat user baru
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Cek apakah user adalah super admin
    if (!session || session.user.role !== User_role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: "Akses ditolak. Hanya super admin yang dapat mengakses endpoint ini." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = userSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Data tidak valid", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { officer_name, email, password, role, address, phone_number, vendor_name } = validation.data;

    // Cek apakah email sudah ada
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah digunakan" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || "password123", 10);

    // Buat user baru
    const newUser = await prisma.user.create({
      data: {
        officer_name,
        email,
        password: hashedPassword,
        role,
        address: address || null,
        phone_number: phone_number || null,
        vendor_name: role === User_role.VENDOR ? (vendor_name || null) : null,
        verified_by: session.user.officer_name,
        verified_at: new Date(),
      },
      select: {
        id: true,
        officer_name: true,
        email: true,
        role: true,
        address: true,
        phone_number: true,
        vendor_name: true,
        created_at: true,
        verified_at: true,
        verified_by: true,
      }
    });

    return NextResponse.json(newUser, { status: 201 });

  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat membuat user" },
      { status: 500 }
    );
  }
}
