import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api/withAuth';
import { apiSuccess } from '@/lib/api/response';
import { submissionService } from '@/services/SubmissionService';
import { generateSIMLOKPDF } from '@/utils/pdf/simlokTemplate';
import type { SubmissionPDFData } from '@/types';

// GET /api/submissions/[id] - Get single submission with optional PDF generation
export const GET = withAuth(
  async (request: NextRequest, session, params) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const isPdfRequest = searchParams.get('format') === 'pdf';
    const shouldClearCache = searchParams.get('clearCache') === 'true';

    // Clear image cache if requested (for PDF generation)
    if (shouldClearCache && isPdfRequest) {
      try {
        const { clearImageCache } = await import('@/utils/pdf/imageLoader');
        clearImageCache();
        console.log('API: Cleared image cache for fresh PDF generation');
      } catch (error) {
        console.warn('API: Failed to clear image cache:', error);
      }
    }

    const submission = await submissionService.getSubmissionByIdWithRelations(
      id,
      session
    );

    // If PDF is requested, generate and return PDF
    if (isPdfRequest) {
      return generatePDFResponse(submission);
    }

    const response = NextResponse.json({ submission });
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
    return response;
  },
  { allowedRoles: ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'VISITOR', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// Helper function to generate PDF response
async function generatePDFResponse(submission: any) {
  try {
    const pdfData = { ...submission };
    
    // If no simlok_number, use placeholder for preview
    if (!submission.simlok_number) {
      const jakartaNow = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
      const now = new Date(jakartaNow);
      const year = now.getFullYear();
      pdfData.simlok_number = `[DRAFT]/S00330/${year}-S0`;
    }

    const pdfBytes = await generateSIMLOKPDF(pdfData as SubmissionPDFData);

    // Generate filename
    let filename: string;
    if (pdfData.simlok_number && !pdfData.simlok_number.startsWith('[DRAFT]')) {
      const cleanSimlokNumber = pdfData.simlok_number.replace(/[\[\]/\\]/g, '_');
      filename = `SIMLOK_${cleanSimlokNumber}.pdf`;
    } else if (pdfData.simlok_number && pdfData.simlok_number.startsWith('[DRAFT]')) {
      const cleanSimlokNumber = pdfData.simlok_number.replace(/[\[\]/\\]/g, '_');
      filename = `SIMLOK_${cleanSimlokNumber}.pdf`;
    } else {
      filename = `SIMLOK_${submission.id}.pdf`;
    }

    const encodedFilename = encodeURIComponent(filename);
    const isApproved = pdfData.simlok_number && !pdfData.simlok_number.startsWith('[DRAFT]');
    const cacheControl = isApproved 
      ? 'public, max-age=86400'
      : 'no-store, no-cache, must-revalidate';
    
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"; filename*=UTF-8''${encodedFilename}`,
        'Cache-Control': cacheControl,
        'Pragma': isApproved ? 'public' : 'no-cache',
        'Expires': isApproved ? new Date(Date.now() + 86400000).toUTCString() : '0',
        'X-PDF-Filename': filename,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}

// PUT /api/submissions/[id] - Update submission
export const PUT = withAuth(
  async (request: NextRequest, session, params) => {
    const { id } = await params;
    const body = await request.json();
    
    const updatedSubmission = await submissionService.updateSubmissionById(id, body, session);
    return apiSuccess(updatedSubmission);
  },
  { allowedRoles: ['VENDOR', 'VERIFIER', 'REVIEWER', 'APPROVER', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// DELETE /api/submissions/[id] - Delete submission
export const DELETE = withAuth(
  async (_request: NextRequest, session, params) => {
    const { id } = await params;
    const result = await submissionService.deleteSubmissionById(id, session);
    return apiSuccess(result);
  },
  { allowedRoles: ['VENDOR', 'VERIFIER', 'ADMIN', 'SUPER_ADMIN'], requireAuth: true }
);

// PATCH /api/submissions/[id] - Update submission (alias for PUT)
export const PATCH = PUT;
