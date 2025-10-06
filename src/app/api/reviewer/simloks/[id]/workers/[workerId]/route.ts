import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import fs from 'fs';
import path from 'path';

// DELETE /api/reviewer/simloks/[id]/workers/[workerId] - Delete worker photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; workerId: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id, workerId } = resolvedParams;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    // Check if submission exists and is still editable
    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
      select: {
        id: true,
        approval_status: true,
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Reviewer cannot edit after Approver has finalized
    if (existingSubmission.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Cannot delete worker after submission has been finalized' 
      }, { status: 400 });
    }

    // Find the worker photo to delete
    const workerPhoto = await prisma.workerList.findUnique({
      where: { id: workerId },
      select: {
        id: true,
        worker_photo: true,
        submission_id: true,
      }
    });

    if (!workerPhoto) {
      return NextResponse.json({ error: 'Worker photo not found' }, { status: 404 });
    }

    // Verify the worker belongs to this submission
    if (workerPhoto.submission_id !== id) {
      return NextResponse.json({ error: 'Worker does not belong to this submission' }, { status: 400 });
    }

    // Delete the physical file if it exists
    try {
      const photoPath = workerPhoto.worker_photo;
      // Extract the relative path from the URL (assuming it starts with /uploads/)
      if (photoPath && photoPath.startsWith('/uploads/')) {
        const relativePath = photoPath.substring(1); // Remove leading slash
        const fullPath = path.join(process.cwd(), 'public', relativePath);
        
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log('Physical file deleted:', fullPath);
        }
      }
    } catch (fileError) {
      console.error('Error deleting physical file:', fileError);
      // Continue with database deletion even if file deletion fails
    }

    // Delete the worker photo from database
    await prisma.workerList.delete({
      where: { id: workerId }
    });

    console.log('Worker photo deleted successfully by reviewer:', session.user.id);
    
    return NextResponse.json({
      message: 'Worker photo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting worker photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}