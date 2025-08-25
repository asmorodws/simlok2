"use client";

import Checkbox from "@/components/form/Checkbox";
import Input from "@/components/form/Input";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import type { FC } from "react";

interface Props {
  email: string;
  password: string;
  showPassword: boolean;
  keepLoggedIn: boolean;
  error: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setShow: (v: boolean) => void;
  setKeep: (v: boolean) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

const SignInForm: FC<Props> = ({
  email,
  password,
  showPassword,
  keepLoggedIn,
  error,
  setEmail,
  setPassword,
  setShow,
  setKeep,
  handleSubmit,
}) => (
  <div className="flex flex-col w-full items-center justify-center my-auto min-h-screen bg-blue-900">
    <div className="flex flex-col justify-center w-full max-w-md mx-auto bg-white p-10 border border-gray-200 rounded-lg shadow-lg">
      <div>
        <div className="mb-5 sm:mb-8">
          <h1 className="mb-2 font-semibold text-gray-800 text-2xl">
            Sign In
          </h1>
          <p className="text-sm text-gray-500">
            Enter your email and password to sign in!
          </p>
        </div>

        {error && (
          <p className="mb-3 text-sm text-center text-red-600">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="flex items-center justify-between">
            <Checkbox
              checked={keepLoggedIn}
              onChange={setKeep}
              label="Keep me logged in"
            />
            <Link
              href="/reset-password"
              className="text-sm text-blue-500 hover:text-blue-600"
            >
              Forgot password?
            </Link>
          </div>

          <Button className="w-full" size="sm" type="submit">
            Sign in
          </Button>
        </form>

        <div className="mt-5">
          <p className="text-sm text-center text-gray-700">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-500 hover:text-blue-600">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);

export default SignInForm;