"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/context/ThemeContext";
// import SessionExpiryHandler from "@/components/security/SessionExpiryHandler";
import ToastContainer from "@/components/ui/toast/ToastContainer";
import { SocketProvider } from "@/app/socket-provider";
import { ReactNode } from "react";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <ThemeProvider>
        <SocketProvider>
          {/* <SessionExpiryHandler> */}
            {children}
            <ToastContainer />
          {/* </SessionExpiryHandler> */}
        </SocketProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}