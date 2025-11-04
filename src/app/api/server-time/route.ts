import { NextResponse } from 'next/server';

/**
 * GET /api/server-time
 * Returns current server time in Jakarta timezone
 * Used by frontend to sync with server time instead of relying on client device time
 */
export async function GET() {
  // Get current time in Jakarta timezone
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const serverTime = new Date(jakartaNow);
  
  const year = serverTime.getFullYear();
  const month = String(serverTime.getMonth() + 1).padStart(2, '0');
  const day = String(serverTime.getDate()).padStart(2, '0');
  const jakartaDate = `${year}-${month}-${day}`;

  return NextResponse.json({
    serverTime: serverTime.toISOString(),
    jakartaDate,
    jakartaDateTime: serverTime.toISOString(),
    timezone: 'Asia/Jakarta',
    offset: '+07:00'
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}
