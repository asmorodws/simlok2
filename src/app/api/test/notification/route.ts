import { NextRequest, NextResponse } from 'next/server';

/**
 * SOFT DELETE IMPLEMENTATION - API AUDIT PROTOCOL STAGE 2
 * 
 * This endpoint has been marked for removal as part of the dead code elimination process.
 * - No frontend references found in static analysis
 * - Endpoint serves no production purpose
 * - Returning HTTP 410 Gone to track any hidden usage
 * 
 * Monitoring Period: 2 weeks from deployment
 * Permanent Removal: After confirmation of no usage
 */

export async function POST(request: NextRequest) {
  // Critical logging for audit trail
  console.warn('🚨 AUDIT: Test notification endpoint accessed - marked for removal');
  console.warn('🔍 Client IP:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
  console.warn('🔍 User Agent:', request.headers.get('user-agent') || 'unknown');
  console.warn('🔍 Timestamp:', new Date().toISOString());
  
  return NextResponse.json({ 
    error: 'Endpoint removed',
    message: 'This test endpoint has been permanently removed. Use the production notification system instead.',
    removedOn: '2025-09-28',
    alternative: '/api/v1/notifications'
  }, { status: 410 }); // HTTP 410 Gone
}

export async function GET(request: NextRequest) {
  // Also handle GET requests that might be probing
  console.warn('🚨 AUDIT: Test notification endpoint GET accessed - marked for removal');
  console.warn('🔍 Client IP:', request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown');
  
  return NextResponse.json({ 
    error: 'Endpoint removed',
    message: 'This test endpoint has been permanently removed.',
    status: 410
  }, { status: 410 });
}
