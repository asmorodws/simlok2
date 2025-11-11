import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { QRService } from '@/services/QRService';

// POST /api/qr/verify - Verify QR code and return submission data
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only VERIFIER and ADMIN can scan QR codes/barcodes
    if (!['VERIFIER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Access denied. Only verifiers and admins can scan QR codes/barcodes.' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { qrData, qr_data, scanLocation, scanner_type } = body;

    // Support both qrData and qr_data parameter names for compatibility
    const qrString = qr_data || qrData;

    if (!qrString) {
      return NextResponse.json({ 
        success: false,
        message: 'QR/Barcode string is required' 
      }, { status: 400 });
    }

    // Use service layer for verification
    const result = await QRService.verifyQR({
      qrString,
      scannedBy: session.user.id,
      scannerType: scanner_type || 'CAMERA',
      scanLocation: scanLocation,
    });

    if (!result.success) {
      const status = result.error === 'duplicate_scan_same_day' ? 409 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('POST /api/qr/verify error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

// GET /api/qr/verify - Get recent scan history (for admin/verifier dashboard)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only VERIFIER and ADMIN can view scan history
    if (!['VERIFIER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ 
        error: 'Access denied. Only verifiers and admins can view scan history.' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const submissionId = searchParams.get('submission_id');

    if (submissionId) {
      // Get scan history for specific submission
      const scans = await QRService.getScanHistory(submissionId, limit);
      return NextResponse.json({ scans });
    }

    // For general scan history, implement later if needed
    return NextResponse.json({ 
      message: 'General scan history endpoint - implement if needed',
      scans: []
    });

  } catch (error) {
    console.error('GET /api/qr/verify error:', error);
    return NextResponse.json({ 
      error: 'Internal server error while fetching scan history' 
    }, { status: 500 });
  }
}
