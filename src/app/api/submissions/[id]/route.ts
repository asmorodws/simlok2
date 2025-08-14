import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { SubmissionApprovalData } from '@/types/submission';

interface RouteParams {
  params: {
    id: string;
  };
}

// GET /api/submissions/[id] - Get submission by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Await params for Next.js 15 compatibility
    const { id } = await params;

    const submission = await prisma.submission.findUnique({
      where: { id },
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

    return NextResponse.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/submissions/[id] - Update submission (Admin for approval, Vendor for editing PENDING submissions)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Await params for Next.js 15 compatibility
    const { id } = await params;

    // Check if submission exists
    const existingSubmission = await prisma.submission.findUnique({
      where: { id }
    });

    if (!existingSubmission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

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
      // Check if vendor owns this submission
      if (existingSubmission.userId !== session.user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check if submission is still editable (PENDING status)
      if (existingSubmission.status_approval_admin !== 'PENDING') {
        return NextResponse.json({ 
          error: 'Cannot edit submission that has been approved or rejected' 
        }, { status: 400 });
      }

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
