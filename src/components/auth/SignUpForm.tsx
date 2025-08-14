"use client";

import Checkbox from "@/components/form/Checkbox";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Button from "@/components/ui/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { FC } from "react";

interface Props {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  showPassword: boolean;
  agreeToTerms: boolean;
  error: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setShow: (v: boolean) => void;
  setAgree: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SignUpForm: FC<Props> = ({
  email,
  password,
  firstName,
  lastName,
  showPassword,
  agreeToTerms,
  error,
  setEmail,
  setPassword,
  setFirstName,
  setLastName,
  setShow,
  setAgree,
  handleSubmit,
}) => (
  <div className="flex flex-col w-full items-center justify-center my-auto min-h-screen bg-blue-900">
    <div className="flex flex-col justify-center w-full max-w-md mx-auto bg-white p-10 border border-gray-200 rounded-lg shadow-lg">
      <div>
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-2xl">
            Sign Up
          </h1>
          <p className="text-sm text-gray-500">
            Create a new account to get started!
          </p>
        </div>

        {error && (
          <p className="mb-3 text-sm text-center text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label>Last Name <span className="text-red-500">*</span></Label>
              <Input
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label>Email <span className="text-red-500">*</span></Label>
            <Input
              type="email"
              placeholder="info@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <Label>Password <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span
                onClick={() => setShow(!showPassword)}
                className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <EyeIcon className="w-5 h-5 text-gray-500" />
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={agreeToTerms}
              onChange={setAgree}
              label=""
            />
            <span className="text-sm text-gray-700">
              I agree to the{" "}
              <Link href="/terms" className="text-blue-500 hover:text-blue-600">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-blue-500 hover:text-blue-600">
                Privacy Policy
              </Link>
            </span>
          </div>

          <Button className="w-full" size="sm" type="submit">
            Sign up
          </Button>
        </form>

        <div className="mt-5">
          <p className="text-sm text-center text-gray-700">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-500 hover:text-blue-600">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default SignUpForm;