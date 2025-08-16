import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { SubmissionApprovalData } from '@/types/submission';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { generateSIMLOKPDF, type SubmissionPDFData } from '@/utils/pdf/simlokTemplate';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/submissions/[id] - Get submission by ID or generate PDF
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const { id } = await params;
    
    // Extract actual submission ID (remove SIMLOK_ prefix if present)
    let submissionId = id;
    if (submissionId.startsWith('SIMLOK_')) {
      submissionId = submissionId.replace('SIMLOK_', '');
    }

    // Check if this is a PDF request based on the Accept header or query parameter
    const url = new URL(request.url);
    const isPdfRequest = url.pathname.includes('/pdf') || 
                        request.headers.get('accept')?.includes('application/pdf') ||
                        url.searchParams.get('format') === 'pdf';

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            nama_petugas: true,
            email: true,
            nama_vendor: true,
          }
        },
        approvedByUser: {
          select: {
            id: true,
            nama_petugas: true,
            email: true,
          }
        }
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Check permissions
    if (session.user.role === 'VENDOR' && submission.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If PDF is requested, generate and return PDF
    if (isPdfRequest) {
      return generatePDF(submission);
    }

    // Return regular JSON response
    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to generate PDF
async function generatePDF(submission: any) {
  try {
    // Only allow PDF generation for APPROVED submissions
    if (submission.status_approval_admin !== 'APPROVED') {
      return NextResponse.json({ error: 'PDF only available for approved submissions' }, { status: 400 });
    }

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = page.getSize();
    const margin = 50;
    let currentY = height - margin;

    // Helper function to add text
    const addText = (text: string, x: number, y: number, options: any = {}) => {
      page.drawText(text, {
        x,
        y,
        size: options.size || 12,
        font: options.bold ? boldFont : font,
        color: rgb(0, 0, 0),
        ...options,
      });
    };

    // Header
    addText('SURAT IZIN MASUK LOKASI (SIMLOK)', width / 2 - 120, currentY, { 
      bold: true, 
      size: 16 
    });
    currentY -= 30;

    // SIMLOK Number and Date
    addText(`Nomor: ${submission.nomor_simlok}`, margin, currentY, { bold: true });
    currentY -= 20;
    
    const formatDate = (dateString: string | Date | null) => {
      if (!dateString) return '-';
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    };

    addText(`Tanggal: ${formatDate(submission.tanggal_simlok)}`, margin, currentY);
    currentY -= 40;

    // Vendor Information
    addText('INFORMASI VENDOR', margin, currentY, { bold: true });
    currentY -= 20;
    addText(`Nama Vendor: ${submission.nama_vendor}`, margin, currentY);
    currentY -= 15;
    addText(`Nama Petugas: ${submission.nama_petugas}`, margin, currentY);
    currentY -= 15;
    addText(`Email: ${submission.user.email}`, margin, currentY);
    currentY -= 30;

    // Work Details
    addText('DETAIL PEKERJAAN', margin, currentY, { bold: true });
    currentY -= 20;
    addText(`Pekerjaan: ${submission.pekerjaan}`, margin, currentY);
    currentY -= 15;
    addText(`Lokasi Kerja: ${submission.lokasi_kerja}`, margin, currentY);
    currentY -= 15;
    addText(`Jam Kerja: ${submission.jam_kerja}`, margin, currentY);
    currentY -= 15;
    
    // Nama Pekerja - tampilkan dalam format list
    addText('Nama Pekerja:', margin, currentY, { bold: true });
    currentY -= 15;
    
    // Split nama pekerja berdasarkan line breaks atau koma dan tampilkan sebagai list
    if (submission.nama_pekerja) {
      const namaPekerjaList = submission.nama_pekerja
        .split(/[\n,]+/) // Split by newlines or commas
        .map((nama: string) => nama.trim())
        .filter((nama: string) => nama.length > 0);
      
      namaPekerjaList.forEach((nama: string, index: number) => {
        addText(`${index + 1}. ${nama}`, margin + 20, currentY);
        currentY -= 15;
      });
    }
    currentY -= 5; // Extra spacing after list
    
    addText(`Sarana Kerja: ${submission.sarana_kerja}`, margin, currentY);
    currentY -= 30;

    // Pelaksanaan
    if (submission.pelaksanaan) {
      addText('PELAKSANAAN', margin, currentY, { bold: true });
      currentY -= 20;
      
      const pelaksanaanLines = submission.pelaksanaan.split('\n');
      pelaksanaanLines.forEach((line: string) => {
        addText(line, margin, currentY);
        currentY -= 15;
      });
      currentY -= 15;
    }

    // Content
    if (submission.content) {
      addText('ISI SURAT', margin, currentY, { bold: true });
      currentY -= 20;
      
      // Split content into lines that fit the page width
      const maxWidth = width - 2 * margin;
      const words = submission.content.split(' ');
      let line = '';
      
      words.forEach((word: string) => {
        const testLine = line + (line ? ' ' : '') + word;
        const textWidth = font.widthOfTextAtSize(testLine, 12);
        
        if (textWidth > maxWidth && line) {
          addText(line, margin, currentY);
          currentY -= 15;
          line = word;
        } else {
          line = testLine;
        }
      });
      
      if (line) {
        addText(line, margin, currentY);
        currentY -= 30;
      }
    }

    // Lain-lain
    if (submission.lain_lain) {
      addText('LAIN-LAIN', margin, currentY, { bold: true });
      currentY -= 20;
      
      const lainLainLines = submission.lain_lain.split('\n');
      lainLainLines.forEach((line: string) => {
        addText(line, margin, currentY);
        currentY -= 15;
      });
      currentY -= 15;
    }

    // Document Information
    addText('INFORMASI DOKUMEN', margin, currentY, { bold: true });
    currentY -= 20;
    
    if (submission.nomor_simja) {
      addText(`SIMJA: ${submission.nomor_simja} - ${formatDate(submission.tanggal_simja)}`, margin, currentY);
      currentY -= 15;
    }
    
    if (submission.nomor_sika) {
      addText(`SIKA: ${submission.nomor_sika} - ${formatDate(submission.tanggal_sika)}`, margin, currentY);
      currentY -= 15;
    }

    // Approval Information
    currentY -= 15;
    addText('INFORMASI PERSETUJUAN', margin, currentY, { bold: true });
    currentY -= 20;
    addText(`Status: ${submission.status_approval_admin}`, margin, currentY);
    currentY -= 15;
    
    if (submission.approvedByUser) {
      addText(`Disetujui oleh: ${submission.approvedByUser.nama_petugas}`, margin, currentY);
      currentY -= 15;
    }
    
    if (submission.keterangan) {
      addText(`Keterangan: ${submission.keterangan}`, margin, currentY);
      currentY -= 15;
    }
    
    if (submission.tembusan) {
      addText('Tembusan:', margin, currentY, { bold: true });
      currentY -= 15;
      
      // Process tembusan as multi-line list like nama pekerja
      const tembusanList = submission.tembusan
        .split(/[\n,]+/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
      
      tembusanList.forEach((item: string, index: number) => {
        addText(`${index + 1}. ${item}`, margin + 20, currentY);
        currentY -= 15;
      });
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Return PDF response
    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="SIMLOK_${submission.nomor_simlok?.replace(/\//g, '_')}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

// PUT /api/submissions/[id] - Update submission (Admin for approval, Vendor for editing PENDING submissions)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('PUT /api/submissions/[id] - Session:', {
      userId: session?.user?.id,
      role: session?.user?.role,
      email: session?.user?.email
    });
    
    if (!session?.user) {
      console.log('PUT /api/submissions/[id] - No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('PUT /api/submissions/[id] - Request body keys:', Object.keys(body));
    
    // Await params for Next.js 15 compatibility
    const { id } = await params;
    console.log('PUT /api/submissions/[id] - Submission ID:', id);

    // Check if submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!existingSubmission) {
      console.log('PUT /api/submissions/[id] - Submission not found:', id);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    
    console.log('PUT /api/submissions/[id] - Existing submission:', {
      id: existingSubmission.id,
      userId: existingSubmission.userId,
      status: existingSubmission.status_approval_admin
    });

    // Admin approval workflow
    if (session.user.role === 'ADMIN' && body.status_approval_admin) {
      // Validate status
      if (!['APPROVED', 'REJECTED'].includes(body.status_approval_admin)) {
        return NextResponse.json({ 
          error: 'Status must be APPROVED or REJECTED' 
        }, { status: 400 });
      }

      // Debug: log session user id
      console.log('Admin approval - Session user ID:', session.user.id);
      console.log('Admin approval - Session user email:', session.user.email);
      
      // If session.user.id is undefined, try to find user by email
      let adminUserId = session.user.id;
      
      if (!adminUserId && session.user.email) {
        console.log('User ID is undefined, finding user by email:', session.user.email);
        const userByEmail = await prisma.user.findUnique({
          where: { email: session.user.email }
        });
        
        if (userByEmail) {
          adminUserId = userByEmail.id;
          console.log('Found user by email:', adminUserId);
        }
      }
      
      if (!adminUserId) {
        console.error('Cannot determine admin user ID');
        return NextResponse.json({ 
          error: 'Cannot determine admin user ID' 
        }, { status: 400 });
      }
      
      // Validate that the admin user exists in the database
      const adminUser = await prisma.user.findUnique({
        where: { id: adminUserId }
      });
      
      if (!adminUser) {
        console.error('Admin user not found in database:', adminUserId);
        return NextResponse.json({ 
          error: 'Admin user not found' 
        }, { status: 400 });
      }

      console.log('Admin user found:', adminUser.nama_petugas, adminUser.role);

      // Prepare update data
      const updateData: any = {
        status_approval_admin: body.status_approval_admin,
        approved_by_admin: adminUserId, // Use the determined admin user ID
        keterangan: body.keterangan,
      };

      // If approved, require nomor_simlok and tembusan
      if (body.status_approval_admin === 'APPROVED') {
        if (!body.nomor_simlok || !body.tembusan) {
          return NextResponse.json({ 
            error: 'nomor_simlok and tembusan are required for approval' 
          }, { status: 400 });
        }
        
        updateData.nomor_simlok = body.nomor_simlok;
        updateData.tanggal_simlok = body.tanggal_simlok ? new Date(body.tanggal_simlok) : new Date();
        updateData.tembusan = body.tembusan;
      }

      const updatedSubmission = await prisma.submission.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
              nama_vendor: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
            }
          }
        }
      });

      return NextResponse.json(updatedSubmission);
    }

    // Vendor editing workflow
    if (session.user.role === 'VENDOR') {
      console.log('PUT /api/submissions/[id] - Vendor editing workflow');
      
      // Check if vendor owns this submission
      if (existingSubmission.userId !== session.user.id) {
        console.log('PUT /api/submissions/[id] - Access denied. User ID mismatch:', {
          sessionUserId: session.user.id,
          submissionUserId: existingSubmission.userId
        });
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check if submission is still editable (PENDING status)
      if (existingSubmission.status_approval_admin !== 'PENDING') {
        console.log('PUT /api/submissions/[id] - Submission not editable. Status:', existingSubmission.status_approval_admin);
        return NextResponse.json({ 
          error: 'Cannot edit submission that has been approved or rejected' 
        }, { status: 400 });
      }

      console.log('PUT /api/submissions/[id] - Preparing vendor update data');
      
      // Prepare update data for vendor edit
      const updateData: any = {
        nama_vendor: body.nama_vendor,
        berdasarkan: body.berdasarkan,
        nama_petugas: body.nama_petugas,
        pekerjaan: body.pekerjaan,
        lokasi_kerja: body.lokasi_kerja,
        pelaksanaan: body.pelaksanaan,
        jam_kerja: body.jam_kerja,
        lain_lain: body.lain_lain,
        sarana_kerja: body.sarana_kerja,
        nama_pekerja: body.nama_pekerja,
        content: body.content,
        upload_doc_sika: body.upload_doc_sika,
        upload_doc_simja: body.upload_doc_simja,
        upload_doc_id_card: body.upload_doc_id_card,
      };

      // Only include SIMJA and SIKA data if provided
      if (body.nomor_simja) {
        updateData.nomor_simja = body.nomor_simja;
      }
      if (body.tanggal_simja) {
        updateData.tanggal_simja = new Date(body.tanggal_simja);
      }
      if (body.nomor_sika) {
        updateData.nomor_sika = body.nomor_sika;
      }
      if (body.tanggal_sika) {
        updateData.tanggal_sika = new Date(body.tanggal_sika);
      }

      console.log('PUT /api/submissions/[id] - Update data prepared, executing prisma update');

      const updatedSubmission = await prisma.submission.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
              nama_vendor: true,
            }
          },
          approvedByUser: {
            select: {
              id: true,
              nama_petugas: true,
              email: true,
            }
          }
        }
      });

      console.log('PUT /api/submissions/[id] - Vendor update successful:', updatedSubmission.id);
      return NextResponse.json(updatedSubmission);
    }

    return NextResponse.json({ error: 'Unauthorized action' }, { status: 403 });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/submissions/[id] - Delete submission (Admin or Vendor for PENDING submissions)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const { id } = await params;

    // Check if submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Admin can delete any submission
    if (session.user.role === 'ADMIN') {
      await prisma.submission.delete({
        where: { id }
      });

      return NextResponse.json({ message: 'Submission deleted successfully' });
    }

    // Vendor can only delete their own PENDING submissions
    if (session.user.role === 'VENDOR') {
      // Check if vendor owns this submission
      if (existingSubmission.userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check if submission is still deletable (PENDING status)
      if (existingSubmission.status_approval_admin !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Cannot delete submission that has been approved or rejected' 
        }, { status: 400 });
      }

      await prisma.submission.delete({
        where: { id }
      });

      return NextResponse.json({ message: 'Submission deleted successfully' });
    }

    return NextResponse.json({ error: 'Unauthorized action' }, { status: 403 });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/submissions/[id] - Update submission (alias for PUT for compatibility)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Delegate to PUT handler for compatibility
  return PUT(request, { params });
}
