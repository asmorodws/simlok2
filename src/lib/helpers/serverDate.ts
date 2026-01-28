/**
 * Server Date Utilities
 * 
 * BEST PRACTICE: Use these utilities instead of `new Date()` throughout the application
 * to ensure all date operations use server time (Jakarta timezone), not browser/device time.
 * 
 * This prevents issues when:
 * - User's device clock is incorrect
 * - User is in different timezone
 * - System time needs to be consistent across all clients
 * 
 * @example
 * // ❌ DON'T do this (uses browser time)
 * const today = new Date();
 * const dateString = new Date().toISOString();
 * 
 * // ✅ DO this instead (uses server time)
 * import { getServerDate, getServerDateString } from '@/lib/helpers/serverDate';
 * const today = await getServerDate();
 * const dateString = await getServerDateString();
 */

import { toJakartaISOString } from './timezone';

// Cache for server time offset
let serverTimeOffset: number | null = null;
let serverTimeFetchPromise: Promise<number> | null = null;

/**
 * Fetch the server time offset (difference between server and client time)
 * Cached after first fetch to avoid unnecessary API calls
 * 
 * @returns Promise<number> - Offset in milliseconds
 */
async function getServerTimeOffset(): Promise<number> {
  // Return cached offset if available
  if (serverTimeOffset !== null) {
    return serverTimeOffset;
  }

  // Return existing fetch promise if already fetching
  if (serverTimeFetchPromise) {
    return serverTimeFetchPromise;
  }

  // Fetch server time
  serverTimeFetchPromise = (async () => {
    try {
      const clientTime = Date.now();
      const response = await fetch('/api/server-time', {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch server time');
      }

      const data = await response.json();
      const serverTime = new Date(data.serverTime).getTime();
      
      // Calculate offset: server time - client time
      const offset = serverTime - clientTime;
      
      serverTimeOffset = offset;
      serverTimeFetchPromise = null;
      
      return offset;
    } catch (error) {
      console.error('Error fetching server time, falling back to Jakarta timezone:', error);
      serverTimeFetchPromise = null;
      
      // Fallback: use Jakarta timezone conversion
      // This is approximate but better than using wrong device time
      serverTimeOffset = 0; // Use client time as fallback
      return 0;
    }
  })();

  return serverTimeFetchPromise;
}

/**
 * Get current server time as Date object
 * 
 * @returns Promise<Date> - Current date/time adjusted to server time
 * @example
 * const now = await getServerDate();
 * console.log(now); // Date object with server time
 */
export async function getServerDate(): Promise<Date> {
  const offset = await getServerTimeOffset();
  const adjustedTime = Date.now() + offset;
  return new Date(adjustedTime);
}

/**
 * Get current server date as YYYY-MM-DD string in Jakarta timezone
 * 
 * @returns Promise<string> - Date string in YYYY-MM-DD format
 * @example
 * const dateStr = await getServerDateString();
 * console.log(dateStr); // "2025-11-04"
 */
export async function getServerDateString(): Promise<string> {
  const serverDate = await getServerDate();
  const jakartaISO = toJakartaISOString(serverDate) || serverDate.toISOString();
  return jakartaISO.split('T')[0] || '';
}

/**
 * Get current server date/time as ISO string in Jakarta timezone
 * 
 * @returns Promise<string> - ISO string in Jakarta timezone
 * @example
 * const isoStr = await getServerDateTime();
 * console.log(isoStr); // "2025-11-04T15:30:00.000Z"
 */
export async function getServerDateTime(): Promise<string> {
  const serverDate = await getServerDate();
  return toJakartaISOString(serverDate) || serverDate.toISOString();
}

/**
 * Format server date for display in Indonesian format
 * 
 * @param format - Format type: 'short' (DD/MM/YYYY) or 'long' (DD MMM YYYY)
 * @returns Promise<string> - Formatted date string
 * @example
 * const short = await formatServerDate('short');  // "04/11/2025"
 * const long = await formatServerDate('long');    // "04 Nov 2025"
 */
export async function formatServerDate(format: 'short' | 'long' = 'short'): Promise<string> {
  const jakartaDateStr = await getServerDateString();
  const [year, month, day] = jakartaDateStr.split('-');

  if (format === 'short') {
    return `${day}/${month}/${year}`;
  }

  // Long format: DD MMM YYYY
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const monthIndex = parseInt(month || '1', 10) - 1;
  const monthName = monthNames[monthIndex] || 'Jan';

  return `${day} ${monthName} ${year}`;
}

/**
 * Check if a date (YYYY-MM-DD) is a weekend (Saturday or Sunday)
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @returns boolean - true if weekend, false if weekday
 * @example
 * const isWeekend = isWeekendDate('2025-11-08'); // true (Saturday)
 */
export function isWeekendDate(dateString: string): boolean {
  const date = new Date(`${dateString}T00:00:00+07:00`); // Jakarta timezone
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day === 0 || day === 6;
}

/**
 * Get Indonesian day name for a date
 * 
 * @param dateString - Date in YYYY-MM-DD format
 * @returns string - Indonesian day name (e.g., "Senin", "Selasa")
 * @example
 * const dayName = getDayName('2025-11-04'); // "Senin"
 */
export function getDayName(dateString: string): string {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return dayNames[date.getDay()] || 'Unknown';
}

/**
 * Refresh server time offset (call this for long-running sessions)
 * Useful for applications that run for hours without page refresh
 * 
 * @returns Promise<void>
 * @example
 * // Refresh every hour
 * setInterval(refreshServerTimeOffset, 60 * 60 * 1000);
 */
export async function refreshServerTimeOffset(): Promise<void> {
  serverTimeOffset = null;
  serverTimeFetchPromise = null;
  await getServerTimeOffset();
}

/**
 * SYNCHRONOUS version: Get current date using Jakarta timezone (fallback only)
 * 
 * ⚠️ WARNING: This uses browser time + timezone conversion, not true server time!
 * Only use this in Server Components or when async is not possible.
 * Prefer getServerDate() or useServerTime() hook in React components.
 * 
 * @returns string - Date in YYYY-MM-DD format
 */
export function getJakartaDateSync(): string {
  const now = new Date();
  const jakartaISO = toJakartaISOString(now) || now.toISOString();
  return jakartaISO.split('T')[0] || '';
}

/**
 * SYNCHRONOUS version: Get current date/time using Jakarta timezone (fallback only)
 * 
 * ⚠️ WARNING: This uses browser time + timezone conversion, not true server time!
 * Only use this in Server Components or when async is not possible.
 * Prefer getServerDateTime() or useServerTime() hook in React components.
 * 
 * @returns string - ISO string
 */
export function getJakartaDateTimeSync(): string {
  const now = new Date();
  return toJakartaISOString(now) || now.toISOString();
}
