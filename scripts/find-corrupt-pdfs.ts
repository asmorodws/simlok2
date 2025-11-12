/**
 * Utility Script: Find and Report Corrupt PDFs in Database
 * 
 * This script scans all PDF files referenced in the database and validates them
 * using pdf-lib to find any corrupt/invalid PDFs that might have been uploaded
 * before the strict validation was implemented.
 * 
 * Usage:
 *   npx tsx scripts/find-corrupt-pdfs.ts
 * 
 * What it does:
 * 1. Queries database for all submissions with support_documents
 * 2. Extracts all PDF file URLs
 * 3. Validates each PDF using pdf-lib
 * 4. Reports corrupt PDFs with submission details
 * 
 * Output:
 * - List of corrupt PDFs with submission ID and document type
 * - Summary statistics
 * - Recommendations for fixing
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

interface CorruptPdfReport {
  submissionId: string;
  simlokNumber: string | null;
  documentType: string;
  filePath: string;
  error: string;
}

async function validatePdfFile(filePath: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Import pdf-lib dynamically
    const { PDFDocument } = await import('pdf-lib');
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return { isValid: false, error: 'File not found on disk' };
    }
    
    // Read file
    const fileBuffer = readFileSync(filePath);
    
    // Try to parse with pdf-lib
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer, {
        ignoreEncryption: true,
        updateMetadata: false,
      });
      
      // Check if PDF has pages
      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        return { isValid: false, error: 'PDF has no pages' };
      }
      
      return { isValid: true };
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      return { isValid: false, error: `Parse failed: ${errorMsg}` };
    }
  } catch (error) {
    return { isValid: false, error: `Validation error: ${error instanceof Error ? error.message : String(error)}` };
  }
}

function extractFilePathFromUrl(url: string): string | null {
  try {
    // URL format: /uploads/... or http://localhost:3000/uploads/...
    const urlObj = new URL(url, 'http://localhost:3000');
    const pathname = urlObj.pathname;
    
    // Remove leading slash and prepend public directory
    const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    return join(process.cwd(), 'public', relativePath);
  } catch {
    return null;
  }
}

async function findCorruptPdfs() {
  console.log('🔍 Starting PDF corruption scan...\n');
  
  const corruptPdfs: CorruptPdfReport[] = [];
  let totalPdfsScanned = 0;
  let filesNotFound = 0;
  
  try {
    // Fetch all submissions with support documents
    const submissions = await prisma.submission.findMany({
      select: {
        id: true,
        simlok_number: true,
        support_documents: {
          select: {
            id: true,
            document_type: true,
            document_upload: true,
          },
        },
      },
    });
    
    console.log(`📊 Found ${submissions.length} submissions to scan\n`);
    
    // Process each submission
    for (const submission of submissions) {
      for (const doc of submission.support_documents) {
        if (!doc.document_upload) continue;
        
        // Only check PDFs
        if (!doc.document_upload.toLowerCase().endsWith('.pdf')) continue;
        
        totalPdfsScanned++;
        
        const filePath = extractFilePathFromUrl(doc.document_upload);
        if (!filePath) {
          console.log(`⚠️  Invalid URL format: ${doc.document_upload}`);
          continue;
        }
        
        if (!existsSync(filePath)) {
          filesNotFound++;
          console.log(`❌ File not found: ${filePath}`);
          continue;
        }
        
        // Validate PDF
        const validation = await validatePdfFile(filePath);
        
        if (!validation.isValid) {
          corruptPdfs.push({
            submissionId: submission.id,
            simlokNumber: submission.simlok_number,
            documentType: doc.document_type || 'UNKNOWN',
            filePath: filePath,
            error: validation.error || 'Unknown error',
          });
          
          console.log(`🔴 CORRUPT PDF FOUND:`);
          console.log(`   Submission: ${submission.simlok_number || submission.id}`);
          console.log(`   Document Type: ${doc.document_type || 'UNKNOWN'}`);
          console.log(`   File: ${filePath}`);
          console.log(`   Error: ${validation.error}`);
          console.log('');
        } else {
          // Valid PDF
          process.stdout.write('.');
        }
      }
    }
    
    // Print summary
    console.log('\n\n📈 SCAN SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Total PDFs scanned:     ${totalPdfsScanned}`);
    console.log(`Valid PDFs:             ${totalPdfsScanned - corruptPdfs.length - filesNotFound}`);
    console.log(`Corrupt PDFs:           ${corruptPdfs.length}`);
    console.log(`Files not found:        ${filesNotFound}`);
    console.log('=' .repeat(60));
    
    if (corruptPdfs.length > 0) {
      console.log('\n🔴 CORRUPT PDFs DETAILS:');
      console.log('=' .repeat(60));
      corruptPdfs.forEach((report, idx) => {
        console.log(`\n${idx + 1}. Submission: ${report.simlokNumber || report.submissionId}`);
        console.log(`   Type: ${report.documentType}`);
        console.log(`   File: ${report.filePath}`);
        console.log(`   Error: ${report.error}`);
      });
      
      console.log('\n\n💡 RECOMMENDATIONS:');
      console.log('=' .repeat(60));
      console.log('1. Contact vendors for these submissions to re-upload valid PDFs');
      console.log('2. Update submission status to indicate document issues');
      console.log('3. Consider adding a "document verification" step in workflow');
      console.log('4. Run this script periodically to catch new issues');
    } else {
      console.log('\n✅ No corrupt PDFs found! All PDFs are valid.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during scan:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
findCorruptPdfs()
  .then(() => {
    console.log('\n✅ Scan completed successfully\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Scan failed:', error);
    process.exit(1);
  });
