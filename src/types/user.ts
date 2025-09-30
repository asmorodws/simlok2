import { User_role as Role, VerificationStatus } from "@prisma/client";

export interface UserData {
  id: string;
  officer_name: string;
  email: string;
  role: Role;
  address?: string | null;
  phone_number?: string | null;
  vendor_name?: string | null;
  created_at: string | Date;
  verified_at?: string | Date | null;
  verified_by?: string | null;
  verification_status?: VerificationStatus;
  rejected_at?: string | Date | null;
  rejected_by?: string | null;
  rejection_reason?: string | null;
  profile_photo?: string | null;
}
