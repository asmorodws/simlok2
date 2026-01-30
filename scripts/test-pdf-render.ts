import { PrismaClient } from '@prisma/client';
import { generateSIMLOKPDF } from '@/utils/pdf/simlokTemplate';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function testPDFRender() {
  try {
    console.log('🔍 Fetching submission data...\n');

    // Get the first submission with workers and documents
    const submission = await prisma.submission.findFirst({
      where: {
        worker_list: {
          some: {},
        },
      },
      include: {
        worker_list: true,
        support_documents: true,
        user: true,
        approved_by_final_user: true,
      },
    });

    if (!submission) {
      console.error('❌ No submission found with workers');
      return;
    }

    console.log(`✅ Found submission: ${submission.id}`);
    console.log(`   Vendor: ${submission.vendor_name}`);
    console.log(`   Workers: ${submission.worker_list.length}`);
    console.log(`   Documents: ${submission.support_documents.length}\n`);

    // Display worker info
    submission.worker_list.forEach((worker, idx) => {
      console.log(`Worker ${idx + 1}: ${worker.worker_name}`);
      console.log(`  Photo: ${worker.worker_photo || 'N/A'}`);
      console.log(`  HSSE Pass: ${worker.hsse_pass_document_upload || 'N/A'}`);
    });

    console.log('\nSupport Documents:');
    submission.support_documents.forEach((doc, idx) => {
      console.log(`  ${idx + 1}. ${doc.document_type}: ${doc.document_upload}`);
    });

    console.log('\n📄 Generating PDF...\n');

    // Generate PDF
    const pdfBytes = await generateSIMLOKPDF(submission);

    console.log(`✅ PDF generated successfully: ${pdfBytes.length} bytes\n`);

    // Save to test output directory
    const outputDir = path.join(process.cwd(), 'public', 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(
      outputDir,
      `test-simlok-${submission.id}-${Date.now()}.pdf`
    );
    fs.writeFileSync(outputPath, pdfBytes);

    console.log(`💾 PDF saved to: ${outputPath}`);
    console.log(`   File size: ${(pdfBytes.length / 1024).toFixed(2)} KB\n`);

    // Test with specific submission ID if provided
    const testSubmissionId = process.argv[2];
    if (testSubmissionId && testSubmissionId !== submission.id) {
      console.log(`\n🔍 Testing with specific submission: ${testSubmissionId}\n`);

      const specificSubmission = await prisma.submission.findUnique({
        where: { id: testSubmissionId },
        include: {
          worker_list: true,
          support_documents: true,
          user: true,
          approved_by_final_user: true,
        },
      });

      if (!specificSubmission) {
        console.error(`❌ Submission ${testSubmissionId} not found`);
        return;
      }

      const pdfBytes2 = await generateSIMLOKPDF(specificSubmission);
      const outputPath2 = path.join(
        outputDir,
        `test-simlok-${testSubmissionId}-${Date.now()}.pdf`
      );
      fs.writeFileSync(outputPath2, pdfBytes2);

      console.log(`✅ PDF generated: ${outputPath2}`);
      console.log(`   File size: ${(pdfBytes2.length / 1024).toFixed(2)} KB\n`);
    }

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Error during PDF rendering test:');
    console.error(error);
    if (error instanceof Error) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
console.log('🚀 Starting PDF Render Test\n');
console.log('Usage: npm run test:pdf [submissionId]\n');
testPDFRender();
