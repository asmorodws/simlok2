import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notifyAdminNewSubmission } from '@/server/events';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { submissionId } = body;

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId is required' }, { status: 400 });
    }

    console.log('🧪 Test: Triggering notification for submission:', submissionId);
    
    // Trigger the same notification system used for real submissions
    await notifyAdminNewSubmission(submissionId);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test notification sent',
      submissionId 
    });
  } catch (error) {
    console.error('❌ Test notification error:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
