import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      nama_petugas: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role: Role;
    nama_petugas: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    nama_petugas?: string;
    accessToken?: string;
  }
}
