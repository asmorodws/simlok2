// src/app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthRedirect from "@/components/auth/AuthRedirect";
import SignUpForm from "@/components/auth/SignUpForm";
import { getCsrfToken } from "next-auth/react";


export default function RegisterPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"VENDOR" | "VERIFIER" | "ADMIN">("VENDOR");
  const [showPassword, setShow] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  const csrf = await getCsrfToken(); // otomatis baca cookie
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // <-- tambahkan ini
    body: JSON.stringify({
      csrfToken: csrf,
      firstName,
      lastName,
      email,
      password,
      role,
    }),
  });

  const data = await res.json();
  if (!res.ok) setError(data.error);
  else router.push("/login");
};

  return (
    <AuthRedirect>
      <SignUpForm
        firstName={firstName}
        lastName={lastName}
        email={email}
        password={password}
        role={role}
        showPassword={showPassword}
        agreed={agreed}
        error={error}
        setFirstName={setFirstName}
        setLastName={setLastName}
        setEmail={setEmail}
        setPassword={setPassword}
        setRole={setRole}
        setShow={setShow}
        setAgreed={setAgreed}
        handleSubmit={handleSubmit}
      />
    </AuthRedirect>
  );
}