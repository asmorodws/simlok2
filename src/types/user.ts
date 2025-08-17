import { Role } from "@prisma/client";

export interface UserData {
  id: string;
  nama_petugas: string;
  email: string;
  role: Role;
  alamat?: string | null;
  no_telp?: string | null;
  nama_vendor?: string | null;
  date_created_at: string | Date;
  verified_at?: string | Date | null;
  verified_by?: string | null;
  foto_profil?: string | null;
}
