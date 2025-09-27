import { NextRequest, NextResponse } from 'next/server';

/**
 * SOFT DELETE IMPLEMENTATION - API AUDIT PROTOCOL STAGE 2
 * 
 * This debug endpoint was found empty and has no frontend references.
 * Implementing soft delete to monitor for any hidden usage before permanent removal.
 * 
 * Status: HTTP 410 Gone 
 * Monitoring Period: 2 weeks
 */

export async function GET(request: NextRequest) {
  console.warn('🚨 AUDIT: Debug vendor-notifications endpoint accessed - marked for removal');
  console.warn('🔍 Client IP:', request.headers.get('x-forwarded-for') || 'unknown');
  console.warn('🔍 Timestamp:', new Date().toISOString());
  
  return NextResponse.json({ 
    error: 'Debug endpoint removed',
    message: 'This debug endpoint has been removed. Use production notification endpoints.',
    status: 410,
    alternative: '/api/v1/notifications'
  }, { status: 410 });
}

export async function POST(request: NextRequest) {
  console.warn('🚨 AUDIT: Debug vendor-notifications POST accessed - marked for removal');
  console.warn('🔍 Client IP:', request.headers.get('x-forwarded-for') || 'unknown');
  
  return NextResponse.json({ 
    error: 'Debug endpoint removed',
    status: 410
  }, { status: 410 });
}