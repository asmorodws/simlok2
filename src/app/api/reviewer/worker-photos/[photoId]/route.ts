import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/security/auth';
import { prisma } from '@/lib/database';
import fs from 'fs/promises';
import path from 'path';

// DELETE /api/reviewer/worker-photos/[photoId] - Delete worker photo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    
    // Find the worker and check if the submission is still editable
    const worker = await prisma.workerList.findUnique({
      where: { id: resolvedParams.photoId },
      include: {
        submission: {
          select: {
            id: true,
            approval_status: true,
          }
        }
      }
    });

    if (!worker) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Cannot delete photos after submission is finalized
    if (worker.submission.approval_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Cannot delete worker photo after submission has been finalized' 
      }, { status: 400 });
    }

    // If worker has a photo, delete the file
    if (worker.worker_photo) {
      try {
        const photoPath = path.join(process.cwd(), 'public', worker.worker_photo);
        await fs.unlink(photoPath);
      } catch (fileError) {
        console.warn('Failed to delete photo file:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }

    // Update worker to remove photo reference
    const updatedWorker = await prisma.workerList.update({
      where: { id: resolvedParams.photoId },
      data: {
        worker_photo: null,
      }
    });

    return NextResponse.json({ 
      worker: updatedWorker,
      message: 'Worker photo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting worker photo:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}