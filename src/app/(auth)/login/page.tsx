"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AuthRedirect from "@/components/auth/AuthRedirect";
import SignInForm from "@/components/auth/SignInForm";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShow] = useState(false);
  const [keepLoggedIn, setKeep] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
    } else {
      router.push("/");
    }
  }

  return (
    <AuthRedirect>
      <SignInForm
        email={email}
        password={password}
        showPassword={showPassword}
        keepLoggedIn={keepLoggedIn}
        error={error}
        setEmail={setEmail}
        setPassword={setPassword}
        setShow={setShow}
        setKeep={setKeep}
        handleSubmit={handleSubmit}
      />
    </AuthRedirect>
  );
}