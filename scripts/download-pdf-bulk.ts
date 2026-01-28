import { PrismaClient, ApprovalStatus, ReviewStatus } from '@prisma/client';
import { generateSIMLOKPDF } from '../src/utils/pdf/simlokTemplate';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
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
  from?: string; // Format: YYYY-MM-DD
  to?: string;   // Format: YYYY-MM-DD
  dateField?: 'created_at' | 'approved_at'; // Field to filter by date
}

async function parseArgs(): Promise<DownloadOptions> {
  const args = process.argv.slice(2);
  
  // Show help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📥 SIMLOK PDF Bulk Download CLI

Usage: npm run download-pdf-bulk -- [options]

Status Filters:
  --approved          Download approved submissions (default)
  --pending           Download pending submissions
  --rejected          Download rejected submissions
  --all               Download all submissions

Date Filters:
  --today             Download submissions created today
  --from YYYY-MM-DD   Download from date (inclusive)
  --to YYYY-MM-DD     Download to date (inclusive)
  --date-field <field>  Date field to filter (created_at or approved_at, default: approved_at)

Advanced Filters:
  --approval-status <status>   Filter by approval status
  --review-status <status>     Filter by review status
  --vendor <id>                Filter by vendor ID
  --limit <number>             Limit number of downloads

Output:
  --output <path>     Custom output directory (default: ./public/downloads/simlok-pdfs)

Examples:
  npm run download-pdf-bulk -- --today
  npm run download-pdf-bulk -- --from 2026-01-01 --to 2026-01-31
  npm run download-pdf-bulk -- --approved --vendor cm123 --limit 50
  npm run download-pdf-bulk -- --all --from 2026-01-01

For more info, see: docs/PDF_DOWNLOAD_CLI.md
    `);
    process.exit(0);
  }
  
  const options: DownloadOptions = {
    // Default: download yang approved, filter by approved_at
    approved: true,
    dateField: 'approved_at',
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
    } else if (arg === '--from' && i + 1 < args.length) {
      const fromDate = args[++i];
      if (fromDate) options.from = fromDate;
    } else if (arg === '--to' && i + 1 < args.length) {
      const toDate = args[++i];
      if (toDate) options.to = toDate;
    } else if (arg === '--date-field' && i + 1 < args.length) {
      const field = args[++i];
      if (field === 'created_at' || field === 'approved_at') {
        options.dateField = field;
      } else {
        console.error(`❌ Invalid --date-field: ${field}. Use 'created_at' or 'approved_at'`);
        process.exit(1);
      }
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

    // Filter by date
    const dateField = options.dateField || 'approved_at'; // Default to approved_at
    
    if (options.today) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      where[dateField] = {
        gte: startOfDay,
        lte: endOfDay,
      };
    } else if (options.from || options.to) {
      // Date range filter
      where[dateField] = {};
      
      if (options.from) {
        const fromDate = new Date(options.from);
        if (isNaN(fromDate.getTime())) {
          console.error(`❌ Invalid --from date format: ${options.from}. Use YYYY-MM-DD`);
          process.exit(1);
        }
        fromDate.setHours(0, 0, 0, 0);
        where[dateField].gte = fromDate;
      }
      
      if (options.to) {
        const toDate = new Date(options.to);
        if (isNaN(toDate.getTime())) {
          console.error(`❌ Invalid --to date format: ${options.to}. Use YYYY-MM-DD`);
          process.exit(1);
        }
        toDate.setHours(23, 59, 59, 999);
        where[dateField].lte = toDate;
      }
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
    let skippedCount = 0;
    const failedSubmissions: Array<{ simlok_number: string; error: string }> = [];

    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      if (!submission || !submission.simlok_number) continue;
      
      try {
        console.log(`\n[${i + 1}/${submissions.length}] Processing: ${submission.simlok_number}`);
        
        // Determine folder based on approved_at date (YYYY-MM format)
        const approvedDate = new Date(submission.approved_at!);
        const year = approvedDate.getFullYear();
        const month = String(approvedDate.getMonth() + 1).padStart(2, '0');
        const monthFolder = `${year}-${month}`;
        
        // Create month-specific directory
        const monthDir = join(outputDir, monthFolder);
        mkdirSync(monthDir, { recursive: true });
        
        // Check if file already exists
        const filename = `SIMLOK_${submission.simlok_number.replace(/\//g, '_')}.pdf`;
        const filepath = join(monthDir, filename);
        
        if (existsSync(filepath)) {
          console.log(`⏭️  Skipped (already exists): ${filepath}`);
          skippedCount++;
          continue;
        }
        
        // Generate PDF
        const pdfBuffer = await generateSIMLOKPDF(submission as any);
        
        // Save to file
        writeFileSync(filepath, pdfBuffer);
        
        console.log(`✅ Saved: ${filepath}`);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Error processing ${submission?.simlok_number || 'unknown'}:`, errorMessage);
        failedSubmissions.push({
          simlok_number: submission?.simlok_number || 'unknown',
          error: errorMessage
        });
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Download Summary:');
    console.log(`   Total: ${submissions.length}`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📁 Output: ${outputDir}`);
    
    if (failedSubmissions.length > 0) {
      console.log('\n❌ Failed Submissions:');
      failedSubmissions.forEach((failed, idx) => {
        console.log(`   ${idx + 1}. ${failed.simlok_number}`);
        console.log(`      Error: ${failed.error}`);
      });
    }
    
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
