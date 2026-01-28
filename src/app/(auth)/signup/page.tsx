import { Metadata } from "next";
import SignUpClient from "./SignUpClient";

export const metadata: Metadata = {
  title: "Daftar | SIMLOK",
  description: "Daftar akun vendor SIMLOK",
};

export default function SignUpPage() {
  return <SignUpClient />;
}
