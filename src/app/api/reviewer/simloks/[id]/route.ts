import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { z } from 'zod';

// Schema for validating submission updates
const updateSubmissionSchema = z.object({
  vendor_name: z.string().optional(),
  vendor_phone: z.string().optional(),
  based_on: z.string().optional(),
  officer_name: z.string().optional(),
  job_description: z.string().optional(),
  work_location: z.string().optional(),
  implementation: z.string().optional(),
  working_hours: z.string().optional(),
  other_notes: z.string().optional(),
  work_facilities: z.string().optional(),
  worker_count: z.number().optional(),
  simja_number: z.string().optional(),
  simja_date: z.string().optional(),
  sika_number: z.string().optional(),
  sika_date: z.string().optional(),
  implementation_start_date: z.string().optional(),
  implementation_end_date: z.string().optional(),
  worker_names: z.string().optional(),
  content: z.string().optional(),
  notes: z.string().optional(),
  signer_position: z.string().optional(),
  signer_name: z.string().optional(),
});

// GET /api/reviewer/simloks/[id] - Get single submission for review
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only REVIEWER, ADMIN, or SUPER_ADMIN can access this endpoint
    if (!['REVIEWER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Reviewer access required' }, { status: 403 });
    }

    const submission = await prisma.submission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
            phone_number: true,
            address: true,
            role: true,
            verified_at: true,
            verified_by: true,
            created_at: true,
          }
        },
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        },
        approved_by_final_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
            created_at: true,
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('Error fetching submission for review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/reviewer/simloks/[id] - Update submission content (only if not finalized)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params;
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
        final_status: true,
      }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Reviewer cannot edit after Approver has finalized
    if (existingSubmission.final_status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ 
        error: 'Cannot edit submission after it has been finalized' 
      }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateSubmissionSchema.parse(body);

    // Convert date strings to Date objects if provided and not empty
    const updateData: any = { ...validatedData };
    
    // Remove empty date fields or convert to Date objects
    if (validatedData.simja_date && validatedData.simja_date.trim() !== '') {
      updateData.simja_date = new Date(validatedData.simja_date);
    } else {
      updateData.simja_date = null;
    }
    
    if (validatedData.sika_date && validatedData.sika_date.trim() !== '') {
      updateData.sika_date = new Date(validatedData.sika_date);
    } else {
      updateData.sika_date = null;
    }
    
    if (validatedData.implementation_start_date && validatedData.implementation_start_date.trim() !== '') {
      updateData.implementation_start_date = new Date(validatedData.implementation_start_date);
    } else {
      updateData.implementation_start_date = null;
    }
    
    if (validatedData.implementation_end_date && validatedData.implementation_end_date.trim() !== '') {
      updateData.implementation_end_date = new Date(validatedData.implementation_end_date);
    } else {
      updateData.implementation_end_date = null;
    }

    const updatedSubmission = await prisma.submission.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
            vendor_name: true,
            phone_number: true,
            address: true,
            role: true,
            verified_at: true,
            verified_by: true,
            created_at: true,
          }
        },
        reviewed_by_user: {
          select: {
            id: true,
            officer_name: true,
            email: true,
          }
        },
        worker_list: {
          select: {
            id: true,
            worker_name: true,
            worker_photo: true,
            created_at: true,
          }
        }
      }
    });

    console.log('Submission updated successfully by reviewer:', session.user.id);
    
    return NextResponse.json({
      message: 'Submission updated successfully',
      submission: updatedSubmission
    });

  } catch (error) {
    console.error('Error updating submission:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}