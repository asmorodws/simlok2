"use client";

import { SessionProvider } from "next-auth/react";
import ToastContainer from "@/components/ui/toast/ToastContainer";
import { ReactNode } from "react";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
      <ToastContainer />
    </SessionProvider>
  );
}