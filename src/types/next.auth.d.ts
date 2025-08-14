import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role; // atau "VENDOR" | "VERIFIER" | "ADMIN"
    } & DefaultSession["user"];
    accessToken?: string; // <-- tambahkan ini
  }

  interface User extends DefaultUser {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    accessToken?: string; // <-- tambahkan juga di JWT kalau mau disimpan di token
  }
}
