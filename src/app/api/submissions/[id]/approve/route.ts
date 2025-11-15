import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/singletons';
import { toJakartaISOString } from '@/lib/timezone';
import { z } from 'zod';
import { generateQrString } from '@/lib/qr-security';
import cache, { CacheKeys } from '@/lib/cache';
import { RouteParams } from '@/types';

/* -------------- SCHEMA -------------- */
const finalApprovalSchema = z.object({
  approval_status: z.enum(['APPROVED', 'REJECTED']),
  note_for_vendor: z.string().optional(),
  simlok_number: z.string().optional(),
  simlok_date: z.string().optional(),
});

/* -------------- SIMLOK GENERATOR -------------- */
async function generateSimlokNumberInTransaction(tx: any): Promise<string> {
  const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const year = new Date(jakartaNow).getFullYear();

  // Lock the entire table briefly to get accurate max number
  const result = await tx.$queryRaw<Array<{ max_number: bigint | null }>>`
    SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(simlok_number, '/', 1) AS UNSIGNED)), 0) as max_number
    FROM Submission
    WHERE simlok_number IS NOT NULL
    FOR UPDATE
  `;

  const currentMax = result[0]?.max_number ? Number(result[0].max_number) : 0;
  const nextNumber = currentMax + 1;
  
  console.log(`📝 Generated SIMLOK number: ${nextNumber} (previous max: ${currentMax})`);
  
  return `${nextNumber}/S00330/${year}-S0`;
}

/* -------------- MAIN HANDLER -------------- */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['APPROVER', 'ADMIN', 'SUPER_ADMIN'].includes(session.user.role))
      return NextResponse.json({ error: 'Approver access required' }, { status: 403 });

    const body = await request.json();
    const validatedData = finalApprovalSchema.parse(body);

    const existingSubmission = await prisma.submission.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!existingSubmission) return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 });

    if (existingSubmission.review_status === 'PENDING_REVIEW')
      return NextResponse.json({ error: 'Submission belum direview' }, { status: 400 });
    if (
      existingSubmission.approval_status !== 'PENDING_APPROVAL' &&
      existingSubmission.approval_status !== 'NEEDS_REVISION'
    )
      return NextResponse.json({ error: 'Submission sudah diproses sebelumnya' }, { status: 400 });

    const approverUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, officer_name: true, position: true, email: true },
    });
    if (!approverUser)
      return NextResponse.json({ error: 'Approver user not found in database' }, { status: 400 });

    let updateData: any = {
      approval_status: validatedData.approval_status,
      note_for_vendor: validatedData.note_for_vendor || '',
      approved_at: new Date(),
      approved_by: session.user.officer_name,
      approved_by_final_id: session.user.id,
      signer_name: approverUser.officer_name,
      signer_position: approverUser.position || 'Sr Officer Security III',
    };

    /* ========== CRITICAL SECTION WITH RETRY ========== */
    const MAX_RETRIES = 5; // Increased from 3 to 5
    let updatedSubmission: any; // <-- will hold the successful result

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🔄 Approval attempt ${attempt}/${MAX_RETRIES} for submission ${id}`);

        const result = await prisma.$transaction(async tx => {
          console.log('🔐 Starting transaction for approval:', id);

          if (validatedData.approval_status === 'APPROVED') {
            // ALWAYS generate new number inside transaction - ignore client-provided number
            const simlokNumber = await generateSimlokNumberInTransaction(tx);
            const jakartaToday = toJakartaISOString(new Date())?.split('T')[0] ?? new Date().toISOString().split('T')[0];
            const qrString = generateQrString({
              id,
              implementation_start_date: existingSubmission.implementation_start_date || new Date(),
              implementation_end_date: existingSubmission.implementation_end_date || new Date(),
            });

            updateData = {
              ...updateData,
              simlok_number: simlokNumber,
              simlok_date: new Date((validatedData.simlok_date || jakartaToday) as string),
              qrcode: qrString,
            };
          }

          return tx.submission.update({ where: { id }, data: updateData });
        }, {
          maxWait: 5000,
          timeout: 10000,
          isolationLevel: 'Serializable',
        });

        updatedSubmission = result; // ✅ FIX: assign ONLY after tx succeeds
        console.log(`✅ Approval successful on attempt ${attempt}`);
        break; // leave retry loop
      } catch (error: any) {
        const isSimlokConflict =
          error?.code === 'P2002' ||
          error?.message?.includes('Unique constraint') ||
          error?.message?.includes('simlok_number');

        if (isSimlokConflict && attempt < MAX_RETRIES) {
          // Exponential backoff with random jitter: 200-400ms, 400-800ms, 800-1600ms, etc.
          const baseWait = Math.pow(2, attempt) * 100;
          const jitter = Math.random() * baseWait;
          const waitMs = baseWait + jitter;
          console.log(`⏳ SIMLOK conflict detected, waiting ${Math.round(waitMs)}ms before retry…`);
          await new Promise(res => setTimeout(res, waitMs));
          continue;
        }
        throw error; // re-throw if not recoverable or no retries left
      }
    }
    /* ========== END CRITICAL SECTION ========== */

    cache.delete(CacheKeys.APPROVER_STATS);

    // fire-and-forget notifications
    if (existingSubmission.user_id)
      import('@/server/events')
        .then(m => m.notifyVendorStatusChange(existingSubmission.user_id!, id, validatedData.approval_status as any))
        .catch(() => {});
    if (validatedData.approval_status === 'APPROVED')
      import('@/server/events')
        .then(m => m.notifyReviewerSubmissionApproved(id))
        .catch(() => {});

    // format dates to Jakarta TZ before responding
    try {
      const { formatSubmissionDates } = await import('@/lib/timezone');
      return NextResponse.json({
        message: validatedData.approval_status === 'APPROVED' ? 'Submission berhasil disetujui' : 'Submission berhasil ditolak',
        submission: formatSubmissionDates(updatedSubmission),
      });
    } catch {
      return NextResponse.json({
        message: validatedData.approval_status === 'APPROVED' ? 'Submission berhasil disetujui' : 'Submission berhasil ditolak',
        submission: updatedSubmission,
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError)
      return NextResponse.json({ error: 'Data tidak valid', details: error.issues }, { status: 400 });

    console.error('Error processing final approval:', {
      error: error.message,
      stack: error.stack,
      submissionId: params,
    });

    return NextResponse.json(
      { error: 'Terjadi kesalahan saat memproses persetujuan final', details: error.message },
      { status: 500 }
    );
  }
}