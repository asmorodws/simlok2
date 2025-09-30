import NextAuth, { DefaultSession } from "next-auth"
import { User_role, VerificationStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: User_role
      officer_name: string
      vendor_name: string | null
      verified_at: Date | null
      verification_status: VerificationStatus
      created_at: Date
      refreshToken: string | undefined
    } & DefaultSession["user"]
  }
}