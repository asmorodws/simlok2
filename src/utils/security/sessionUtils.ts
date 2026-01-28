/**
 * Session Utilities
 * Helper functions for session management on client side
 */

import { signOut } from 'next-auth/react';

/**
 * Force logout - clears all cookies and sessions
 */
export async function forceLogout(reason?: string) {
  try {
    // Call logout API to clear server-side session
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error calling logout API:', error);
  }

  // Clear client-side storage
  if (typeof window !== 'undefined') {
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear all cookies manually (fallback)
    document.cookie.split(';').forEach((cookie) => {
      const [name] = cookie.split('=');
      if (name) {
        document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
  }

  // Use NextAuth signOut
  await signOut({
    callbackUrl: `/login${reason ? `?session_expired=true&reason=${encodeURIComponent(reason)}` : ''}`,
    redirect: true,
  });
}

/**
 * Check if session is still valid
 */
export async function checkSessionValidity(): Promise<boolean> {
  try {
    const response = await fetch('/api/session/validate', {
      credentials: 'include',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.isValid === true;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
}

/**
 * Clear old sessions (for migration from old system)
 */
export async function clearOldSessions() {
  if (typeof window !== 'undefined') {
    // Clear specific NextAuth cookies
    const cookiesToClear = [
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
    ];

    cookiesToClear.forEach((cookieName) => {
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });
  }
}

/**
 * Show session expired notification
 */
export function showSessionExpiredNotification(reason?: string) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Sesi Berakhir', {
        body: reason || 'Sesi Anda telah berakhir. Silakan login kembali.',
        icon: '/favicon.ico',
      });
    }
  }
}
