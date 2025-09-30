import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { Role, VerificationStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      officer_name: string;
      vendor_name?: string | null;
      verified_at?: Date | null;
      verification_status?: VerificationStatus;
      created_at?: Date;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User extends DefaultUser {
    role: Role;
    officer_name: string;
    vendor_name?: string | null;
    verified_at?: Date | null;
    verification_status?: VerificationStatus;
    created_at?: Date;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    officer_name?: string;
    vendor_name?: string | null;
    verified_at?: Date | null;
    verification_status?: VerificationStatus;
    created_at?: Date;
    accessToken?: string;
  }
}
