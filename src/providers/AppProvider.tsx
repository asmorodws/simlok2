"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
import SessionExpiryHandler from "@/components/SessionExpiryHandler";
import { ReactNode } from "react";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <SessionExpiryHandler>
          {children}
        </SessionExpiryHandler>
      </ThemeProvider>
    </SessionProvider>
  );
}