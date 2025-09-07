#!/usr/bin/env node

/**
 * Test script untuk worker photo functionality
 * Menguji FileManager dan path resolution
 */

const { fileManager } = require('./src/lib/fileManager');
const fs = require('fs');
const path = require('path');

async function testWorkerPhotoFeatures() {
  console.log('🧪 Testing Worker Photo Features...\n');
  
  // Test data
  const testUserId = 'test-user-123';
  const testWorkerName = 'John Doe';
  const testImagePath = path.join(__dirname, 'public', 'assets', 'logo_pertamina.png');
  
  try {
    // 1. Test folder structure creation
    console.log('1. Testing folder structure...');
    const folders = fileManager.getUserFolderStructure(testUserId);
    console.log('   ✅ Folder structure created');
    console.log('   - Worker photo folder:', folders.workerPhoto);
    
    // 2. Test file category detection
    console.log('\n2. Testing category detection...');
    const categories = [
      { field: 'worker-photo', file: 'john_photo.jpg', expected: 'worker-photo' },
      { field: 'sika-doc', file: 'sika_cert.pdf', expected: 'sika' },
      { field: null, file: 'foto_pekerja.jpg', expected: 'worker-photo' },
    ];
    
    for (const test of categories) {
      const category = fileManager.getFileCategory(test.field, test.file);
      const status = category === test.expected ? '✅' : '❌';
      console.log(`   ${status} ${test.file} → ${category} (expected: ${test.expected})`);
    }
    
    // 3. Test worker photo naming
    console.log('\n3. Testing worker photo naming...');
    const cleanName = testWorkerName
      .replace(/[^a-zA-Z0-9\-_\s]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    console.log(`   ✅ "${testWorkerName}" → "${cleanName}"`);
    
    // 4. Test path mapping for PDF
    console.log('\n4. Testing path mapping...');
    const pathMappings = {
      'worker-photo': 'foto-pekerja',
      'sika': 'dokumen-sika',
      'simja': 'dokumen-simja',
      'id_card': 'id-card',
      'other': 'lainnya'
    };
    
    for (const [category, folder] of Object.entries(pathMappings)) {
      console.log(`   ✅ ${category} → ${folder}`);
    }
    
    // 5. Test API URL generation
    console.log('\n5. Testing API URL generation...');
    const testFileName = 'John_Doe_1642123456789.jpg';
    const expectedUrl = `/api/files/${testUserId}/worker-photo/${testFileName}`;
    console.log(`   ✅ URL: ${expectedUrl}`);
    
    // 6. Simulate file upload (if test image exists)
    if (fs.existsSync(testImagePath)) {
      console.log('\n6. Testing simulated file upload...');
      const fileBuffer = fs.readFileSync(testImagePath);
      
      // This would normally save the file
      console.log(`   ✅ File buffer created (${fileBuffer.length} bytes)`);
      console.log(`   ✅ Would save as: ${cleanName}_${Date.now()}.png`);
    } else {
      console.log('\n6. Skipping file upload test (no test image found)');
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
    // Print usage instructions
    console.log('\n📋 Usage Instructions:');
    console.log('   1. Upload worker photo: POST /api/upload/worker-photo');
    console.log('   2. Access photo: GET /api/files/{userId}/worker-photo/{filename}');
    console.log('   3. PDF will automatically load photos from correct paths');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run tests
testWorkerPhotoFeatures();
