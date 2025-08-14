// src/components/auth/SignUpForm.tsx
"use client";

import type { FC } from "react";
import Checkbox from "@/components/form/input/Checkbox";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";

interface Props {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "VENDOR" | "VERIFIER" | "ADMIN";
  showPassword: boolean;
  agreed: boolean;
  error: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setRole: (v: "VENDOR" | "VERIFIER" | "ADMIN") => void;
  setShow: (v: boolean) => void;
  setAgreed: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const roles: ("VENDOR" | "VERIFIER" | "ADMIN")[] = ["VENDOR", "VERIFIER", "ADMIN"];

const SignUpForm: FC<Props> = ({
  firstName,
  lastName,
  email,
  password,
  role,
  showPassword,
  agreed,
  error,
  setFirstName,
  setLastName,
  setEmail,
  setPassword,
  setRole,
  setShow,
  setAgreed,
  handleSubmit,
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-brand-950">
    <div className="w-full max-w-md mx-auto bg-white p-10 rounded-lg shadow-theme-xs">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Create Account</h1>
        <p className="text-sm text-gray-500 mt-1">Fill the form below to sign up.</p>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Names */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>First Name<span className="text-error-500">*</span></Label>
            <Input
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Last Name<span className="text-error-500">*</span></Label>
            <Input
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <Label>Email<span className="text-error-500">*</span></Label>
          <Input
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {/* Password */}
        <div>
          <Label>Password<span className="text-error-500">*</span></Label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span
              onClick={() => setShow(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5 text-gray-500" />
              ) : (
                <EyeIcon className="w-5 h-5 text-gray-500" />
              )}
            </span>
          </div>
        </div>

        {/* Role */}
        <div>
          <Label>Role<span className="text-error-500">*</span></Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full h-11 rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
            required
          >
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Terms */}
        <div className="flex items-start gap-3">
          <Checkbox checked={agreed} onChange={setAgreed} />
          <p className="text-sm text-gray-600">
            By creating an account you agree to the{" "}
            <span className="text-gray-800 underline">Terms & Conditions</span>{" "}
            and <span className="text-gray-800 underline">Privacy Policy</span>.
          </p>
        </div>

        <Button type="submit" className="w-full" size="md" disabled={!agreed}>
          Sign Up
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="text-brand-500 hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  </div>
);

export default SignUpForm;