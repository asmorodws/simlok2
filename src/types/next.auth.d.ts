import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      nama_petugas: string;
      nama_vendor?: string | null;
      verified_at?: Date | null;
      date_created_at?: Date;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role: Role;
    nama_petugas: string;
    nama_vendor?: string | null;
    verified_at?: Date | null;
    date_created_at?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    nama_petugas?: string;
    nama_vendor?: string | null;
    verified_at?: Date | null;
    date_created_at?: Date;
    accessToken?: string;
  }
}
