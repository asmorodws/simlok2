"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { JWT_CONFIG, getTimeUntilExpiry, formatExpiryTime } from "@/utils/jwt-config";

interface SessionExpiryHandlerProps {
  children: React.ReactNode;
}

export default function SessionExpiryHandler({ children }: SessionExpiryHandlerProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (status === "authenticated" && session) {
      // Calculate time until session expires
      const now = Date.now() / 1000;
      const expiresAt = session.expires ? new Date(session.expires).getTime() / 1000 : now + JWT_CONFIG.SESSION_MAX_AGE;
      const timeUntilExpiry = getTimeUntilExpiry(expiresAt) * 1000; // Convert to milliseconds

      console.log('Session expires at:', new Date(expiresAt * 1000));
      console.log('Time until expiry:', formatExpiryTime(timeUntilExpiry / 1000));

      if (timeUntilExpiry > 0) {
        // Set timeout to show warning before expiry
        const warningTime = Math.max(0, timeUntilExpiry - (JWT_CONFIG.WARNING_BEFORE_EXPIRY * 60 * 1000));
        
        timeoutRef.current = setTimeout(async () => {
          const shouldExtend = confirm(
            `Your session will expire in ${JWT_CONFIG.WARNING_BEFORE_EXPIRY} minutes. Would you like to extend your session?`
          );
          
          if (shouldExtend) {
            // Trigger a session refresh using NextAuth's update method
            try {
              await update();
              console.log('Session refreshed successfully');
            } catch (error) {
              console.error('Failed to refresh session:', error);
              router.push("/login");
            }
          } else {
            // Set another timeout for actual expiry
            setTimeout(() => {
              alert("Your session has expired. Please log in again.");
              router.push("/login");
            }, JWT_CONFIG.WARNING_BEFORE_EXPIRY * 60 * 1000);
          }
        }, warningTime);
      } else {
        // Session already expired
        console.log('Session already expired');
        router.push("/login");
      }
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [session, status, router, update]);

  // Auto-refresh session periodically (but not on visibility change)
  useEffect(() => {
    // Clear existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    // Auto-refresh based on configured interval (only when authenticated)
    if (status === "authenticated") {
      refreshIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch("/api/auth/session");
          if (!response.ok) {
            console.log('Session validation failed, redirecting to login');
            router.push("/login");
          }
        } catch (error) {
          console.error('Session validation error:', error);
          router.push("/login");
        }
      }, JWT_CONFIG.AUTO_REFRESH_INTERVAL * 60 * 1000); // Convert minutes to milliseconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [status, router]);

  return <>{children}</>;
}
