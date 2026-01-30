import { PrismaClient, ApprovalStatus, ReviewStatus } from '@prisma/client';
import { generateSIMLOKPDF } from '../src/utils/pdf/simlokTemplate';
import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

// 📝 Logger for cron job
class CronLogger {
  private logFile: string;
  private logDir: string;

  constructor() {
    this.logDir = join(process.cwd(), 'logs');
    const date = new Date().toISOString().split('T')[0];
    this.logFile = join(this.logDir, `cron-pdf-download-${date}.log`);
    
    // Ensure log directory exists
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [PDF-DOWNLOAD] ${message}`;
  }

  private write(level: string, message: string) {
    const formatted = this.formatMessage(level, message);
    console.log(formatted);
    appendFileSync(this.logFile, formatted + '\n', 'utf-8');
  }

  info(message: string) {
    this.write('INFO', message);
  }

  warn(message: string) {
    this.write('WARN', message);
  }

  error(message: string) {
    this.write('ERROR', message);
  }

  success(message: string) {
    this.write('SUCCESS', message);
  }

  summary(title: string, data: Record<string, any>) {
    const line = '='.repeat(60);
    this.write('INFO', line);
    this.write('INFO', `📊 ${title}`);
    Object.entries(data).forEach(([key, value]) => {
      this.write('INFO', `   ${key}: ${value}`);
    });
    this.write('INFO', line);
  }

  getLogFilePath(): string {
    return this.logFile;
  }
}

const cronLogger = new CronLogger();

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
    cronLogger.info('🚀 Starting PDF download job...');
    
    const options = await parseArgs();
    cronLogger.info(`Options: ${JSON.stringify(options)}`);
    
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
      cronLogger.warn('No submissions found matching the criteria.');
      return;
    }

    cronLogger.info(`Found ${submissions.length} submission(s)`);

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
        cronLogger.info(`[${i + 1}/${submissions.length}] Processing: ${submission.simlok_number}`);
        
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
          cronLogger.info(`Skipped (already exists): ${filepath}`);
          skippedCount++;
          continue;
        }
        
        // Generate PDF
        const pdfBuffer = await generateSIMLOKPDF(submission as any);
        
        // Save to file
        writeFileSync(filepath, pdfBuffer);
        
        cronLogger.success(`Saved: ${filepath}`);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        cronLogger.error(`Error processing ${submission?.simlok_number || 'unknown'}: ${errorMessage}`);
        failedSubmissions.push({
          simlok_number: submission?.simlok_number || 'unknown',
          error: errorMessage
        });
        errorCount++;
      }
    }

    // Log summary
    cronLogger.summary('Download Summary', {
      'Total': submissions.length,
      '✅ Success': successCount,
      '⏭️  Skipped': skippedCount,
      '❌ Failed': errorCount,
      '📁 Output': outputDir,
      '📝 Log file': cronLogger.getLogFilePath()
    });
    
    if (failedSubmissions.length > 0) {
      cronLogger.error('Failed Submissions:');
      failedSubmissions.forEach((failed, idx) => {
        cronLogger.error(`  ${idx + 1}. ${failed.simlok_number} - ${failed.error}`);
      });
    }

  } catch (error) {
    cronLogger.error(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    cronLogger.info('🏁 PDF download job completed.');
  }
}

// Run
downloadPDFs();
