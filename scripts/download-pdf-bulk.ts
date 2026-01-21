import { PrismaClient, ApprovalStatus, ReviewStatus } from '@prisma/client';
import { generateSIMLOKPDF } from '../src/utils/pdf/simlokTemplate';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface DownloadOptions {
  approvalStatus?: ApprovalStatus;
  reviewStatus?: ReviewStatus;
  vendorId?: string;
  limit?: number;
  output?: string;
  all?: boolean;
  approved?: boolean;
  pending?: boolean;
  rejected?: boolean;
  today?: boolean;
}

async function parseArgs(): Promise<DownloadOptions> {
  const args = process.argv.slice(2);
  const options: DownloadOptions = {
    // Default: download yang approved
    approved: true,
    output: './public/downloads/simlok-pdfs'
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--all') {
      options.all = true;
      options.approved = false; // Override default
    } else if (arg === '--approved') {
      options.approved = true;
      options.all = false;
    } else if (arg === '--pending') {
      options.pending = true;
      options.approved = false; // Override default
      options.all = false;
    } else if (arg === '--rejected') {
      options.rejected = true;
      options.approved = false; // Override default
      options.all = false;
    } else if (arg === '--today') {
      options.today = true;
    } else if (arg === '--approval-status' && i + 1 < args.length) {
      options.approvalStatus = args[++i] as ApprovalStatus;
      options.approved = false; // Override default
      options.all = false;
    } else if (arg === '--review-status' && i + 1 < args.length) {
      options.reviewStatus = args[++i] as ReviewStatus;
      options.approved = false; // Override default
      options.all = false;
    } else if (arg === '--vendor' && i + 1 < args.length) {
      const vendorId = args[++i];
      if (vendorId) options.vendorId = vendorId;
    } else if (arg === '--limit' && i + 1 < args.length) {
      const limitArg = args[++i];
      if (limitArg) options.limit = parseInt(limitArg, 10);
    } else if (arg === '--output' && i + 1 < args.length) {
      const outputArg = args[++i];
      if (outputArg) options.output = outputArg;
    }
  }

  return options;
}

async function downloadPDFs() {
  try {
    const options = await parseArgs();
    // Build query filter
    const where: any = {};

    if (options.all) {
      // No filter, download all
    } else if (options.approved) {
      // Hanya download yang sudah approved oleh reviewer DAN approver
      where.approval_status = ApprovalStatus.APPROVED;
      where.review_status = ReviewStatus.MEETS_REQUIREMENTS;
    } else if (options.pending) {
      where.approval_status = ApprovalStatus.PENDING_APPROVAL;
    } else if (options.rejected) {
      where.approval_status = ApprovalStatus.REJECTED;
    } else if (options.approvalStatus) {
      where.approval_status = options.approvalStatus;
    } else if (options.reviewStatus) {
      where.review_status = options.reviewStatus;
    }

    if (options.vendorId) {
      where.user_id = options.vendorId;
    }

    if (options.vendorId) {
      where.user_id = options.vendorId;
    }

    // Filter by today if requested
    if (options.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      where.created_at = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Fetch submissions
    const submissions = await prisma.submission.findMany({
      where,
      ...(options.limit && { take: options.limit }),
      include: {
        user: true,
        worker_list: true,
        support_documents: true,
        approved_by_final_user: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (submissions.length === 0) {
      console.log('⚠️  No submissions found matching the criteria.');
      return;
    }

    console.log(`📄 Found ${submissions.length} submission(s)`);

    // Create output directory
    const outputDir = options.output || './public/downloads/simlok-pdfs';

    // Download each PDF
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      if (!submission || !submission.simlok_number) continue;
      
      try {
        console.log(`\n[${i + 1}/${submissions.length}] Processing: ${submission.simlok_number}`);
        
        // Generate PDF
        const pdfBuffer = await generateSIMLOKPDF(submission as any);
        
        // Determine folder based on approved_at date (YYYY-MM format)
        const approvedDate = new Date(submission.approved_at!);
        const year = approvedDate.getFullYear();
        const month = String(approvedDate.getMonth() + 1).padStart(2, '0');
        const monthFolder = `${year}-${month}`;
        
        // Create month-specific directory
        const monthDir = join(outputDir, monthFolder);
        mkdirSync(monthDir, { recursive: true });
        
        // Save to file with format: SIMLOK_396_S00330_2026-S0.pdf
        const filename = `SIMLOK_${submission.simlok_number.replace(/\//g, '_')}.pdf`;
        const filepath = join(monthDir, filename);
        writeFileSync(filepath, pdfBuffer);
        
        console.log(`✅ Saved: ${filepath}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Error processing ${submission?.simlok_number || 'unknown'}:`, error);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Download Summary:');
    console.log(`   Total: ${submissions.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📁 Output: ${outputDir}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
downloadPDFs();
