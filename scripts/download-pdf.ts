import { PrismaClient } from '@prisma/client';
import { generateSIMLOKPDF } from '../src/utils/pdf/simlokTemplate';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function downloadPDF() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage: npm run download-pdf -- <submission-id> [--output <directory>]');
      console.log('Example: npm run download-pdf -- 123 --output ./downloads');
      process.exit(1);
    }

    const submissionId = args[0];
    if (!submissionId) {
      console.error('❌ Submission ID is required');
      process.exit(1);
    }

    const outputArg = args.includes('--output') ? args[args.indexOf('--output') + 1] : undefined;
    const outputDir = outputArg || './public/downloads/simlok-pdfs';

    console.log(`📥 Downloading PDF for submission ID: ${submissionId}`);

    // Fetch submission
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        worker_list: true,
        support_documents: true,
        approved_by_final_user: true,
      },
    });

    if (!submission) {
      console.error(`❌ Submission with ID ${submissionId} not found`);
      process.exit(1);
    }

    console.log(`📄 Found submission: ${submission.simlok_number}`);

    // Generate PDF
    console.log('🔄 Generating PDF...');
    const pdfBuffer = await generateSIMLOKPDF(submission as any);

    // Create output directory
    mkdirSync(outputDir, { recursive: true });

    // Save to file with format: SIMLOK_396_S00330_2026-S0.pdf
    if (!submission.simlok_number) {
      console.error('❌ SIMLOK number is missing');
      process.exit(1);
    }
    const filename = `SIMLOK_${submission.simlok_number.replace(/\//g, '_')}.pdf`;
    const filepath = join(outputDir, filename);
    writeFileSync(filepath, pdfBuffer);

    console.log(`✅ PDF saved successfully: ${filepath}`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
downloadPDF();
