/**
 * POST /api/admin/cleanup-notifications
 * Admin endpoint to clean up orphaned notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cleanupOrphanedNotifications } from '@/lib/notificationCleanup';

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admin can run cleanup
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied. Admin role required.' }, { status: 403 });
    }

    console.log(`Admin ${session.user.id} initiated notification cleanup`);

    const cleanedCount = await cleanupOrphanedNotifications();

    return NextResponse.json({
      message: 'Notification cleanup completed successfully',
      result: {
        notificationsCleaned: cleanedCount
      }
    });

  } catch (error) {
    console.error('Error in notification cleanup:', error);
    return NextResponse.json({ 
      error: 'Internal server error during cleanup' 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed. Use POST to run cleanup.' 
  }, { status: 405 });
}
