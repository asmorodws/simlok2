import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';
import { notifyApproverReviewedSubmission } from '@/server/events';

// Schema for validating review data
const reviewSchema = z.object({
  review_status: z.enum(['MEETS_REQUIREMENTS', 'NOT_MEETS_REQUIREMENTS']),
  review_note: z.string().optional(),
  final_note: z.string().optional(),
});

// PATCH /api/reviewer/simloks/[id]/review - Set review status and note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    // Check if submission exists and is still reviewable
    const existingSubmission = await prisma.submission.findUnique({
      where: { id: resolvedParams.id },
      select: {
        id: true,
        final_status: true,
        user_id: true,
        user: {
          select: {
            vendor_name: true,
            officer_name: true,
          }
        }
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Reviewer cannot review after Approver has finalized
    if (existingSubmission.final_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Cannot review submission after it has been finalized' 
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = reviewSchema.parse(body);

    const updatedSubmission = await prisma.submission.update({
      where: { id: resolvedParams.id },
      data: {
        review_status: validatedData.review_status,
        review_note: validatedData.review_note || null,
        final_note: validatedData.final_note || null,
        reviewed_by_id: session.user.id,
        reviewed_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
          }
        },
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        }
      }
    });

    // Notify approvers about the review result (both meets and doesn't meet requirements)
    await notifyApproverReviewedSubmission(resolvedParams.id);

    return NextResponse.json({ 
      submission: updatedSubmission,
      message: 'Review submitted successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error', 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}