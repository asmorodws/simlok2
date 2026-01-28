import { Metadata } from "next";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "Login | SIMLOK",
  description: "Login ke sistem SIMLOK",
};

export default function LoginPage() {
  return <LoginClient />;
}
