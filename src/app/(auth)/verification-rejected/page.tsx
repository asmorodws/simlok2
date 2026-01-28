import { Metadata } from "next";
import VerificationRejectedClient from "./VerificationRejectedClient";

export const metadata: Metadata = {
  title: "Verifikasi Ditolak | SIMLOK",
  description: "Verifikasi akun vendor ditolak",
};

export default function VerificationRejectedPage() {
  return <VerificationRejectedClient />;
}
