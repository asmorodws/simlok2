/**
 * Test Script for PDF Document Loading
 * 
 * This script tests the loadWorkerDocument function to ensure
 * it properly handles both image and PDF files.
 * 
 * Run with: npx tsx scripts/test-pdf-document-loader.ts
 */

import { PDFDocument } from 'pdf-lib';
import { loadWorkerDocument } from '../src/utils/pdf/imageLoader';
import { join } from 'path';
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';

async function testDocumentLoader() {
  console.log('🧪 Testing PDF Document Loader\n');
  
  // Create a test PDF document
  const testDoc = await PDFDocument.create();
  testDoc.addPage([400, 600]);
  
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  
  // Check if uploads directory exists
  if (!existsSync(uploadsDir)) {
    console.log('❌ Uploads directory not found at:', uploadsDir);
    console.log('ℹ️  Please create test files first or run with actual user data\n');
    return;
  }
  
  console.log('📁 Scanning uploads directory...\n');
  
  // Get all user directories
  const userDirs = await readdir(uploadsDir);
  
  for (const userId of userDirs) {
    const userPath = join(uploadsDir, userId);
    const hsseWorkerPath = join(userPath, 'dokumen-hsse-pekerja');
    
    if (!existsSync(hsseWorkerPath)) {
      console.log(`⏭️  Skipping ${userId}: No dokumen-hsse-pekerja folder`);
      continue;
    }
    
    console.log(`\n📂 User: ${userId}`);
    console.log('─'.repeat(60));
    
    try {
      const files = await readdir(hsseWorkerPath);
      
      if (files.length === 0) {
        console.log('  ℹ️  No files found in dokumen-hsse-pekerja/');
        continue;
      }
      
      for (const file of files) {
        const apiPath = `/api/files/${userId}/hsse-worker/${file}`;
        const fileType = file.toLowerCase().endsWith('.pdf') ? 'PDF' : 
                        file.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? 'Image' : 'Unknown';
        
        console.log(`\n   Testing: ${file}`);
        console.log(`     Type: ${fileType}`);
        console.log(`     API Path: ${apiPath}`);
        
        try {
          const result = await loadWorkerDocument(testDoc, apiPath);
          
          if (result.type === 'image') {
            console.log(`     ✅ Result: Image loaded successfully`);
            const imgDims = result.image!.scale(1);
            console.log(`     📐 Dimensions: ${imgDims.width}x${imgDims.height}`);
          } else if (result.type === 'pdf') {
            console.log(`     ✅ Result: PDF loaded successfully`);
            console.log(`      Pages: ${result.pdfPages!.getPageCount()}`);
          } else {
            console.log(`     ❌ Result: Unsupported/Error`);
            console.log(`     ⚠️  Error: ${result.error}`);
          }
        } catch (error) {
          console.log(`     ❌ Exception: ${error}`);
        }
      }
    } catch (error) {
      console.log(`  ❌ Error reading directory: ${error}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test completed');
}

// Run test
testDocumentLoader()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
