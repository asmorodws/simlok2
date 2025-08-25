"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionExpiryHandler from "@/components/security/SessionExpiryHandler";
import ToastContainer from "@/components/ui/toast/ToastContainer";
import { ReactNode } from "react";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SessionExpiryHandler>
          {children}
          <ToastContainer />
        </SessionExpiryHandler>
      </ThemeProvider>
    </SessionProvider>
  );
}