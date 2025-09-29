// Simple test to check PDF generation performance
const { performance } = require('perf_hooks');

// Mock submission data for testing
const mockSubmissionData = {
  id: 'test-id',
  simlok_number: '001/TEST/2024',
  vendor_name: 'PT Test Vendor',
  officer_name: 'John Doe',
  simja_number: 'SIMJA001',
  simja_date: new Date(),
  sika_number: 'SIKA001', 
  sika_date: new Date(),
  implementation_start_date: new Date(),
  implementation_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  received_date: new Date(),
  work_location: 'Test Location',
  work_description: 'Test work description',
  worker_count: 5,
  workerList: [
    { worker_name: 'Worker 1', worker_photo: null },
    { worker_name: 'Worker 2', worker_photo: null },
    { worker_name: 'Worker 3', worker_photo: null },
    { worker_name: 'Worker 4', worker_photo: null },
    { worker_name: 'Worker 5', worker_photo: null }
  ],
  other_info: 'Test info'
};

async function testPDFPerformance() {
  try {
    console.log('🚀 Starting PDF performance test...');
    
    const startTime = performance.now();
    
    // Import the PDF generation function
    const { generateSIMLOKPDF } = await import('./src/utils/pdf/simlokTemplate.ts');
    
    console.log('📄 Generating PDF...');
    const pdfBuffer = await generateSIMLOKPDF(mockSubmissionData);
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`✅ PDF generated successfully!`);
    console.log(`📊 Performance metrics:`);
    console.log(`   - Generation time: ${duration.toFixed(2)}ms`);
    console.log(`   - PDF size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    console.log(`   - Workers processed: ${mockSubmissionData.workerList.length}`);
    
    if (duration < 3000) {
      console.log('🎉 Excellent performance! (< 3 seconds)');
    } else if (duration < 5000) {
      console.log('✅ Good performance (< 5 seconds)');
    } else {
      console.log('⚠️  Performance could be improved (> 5 seconds)');
    }
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error);
    process.exit(1);
  }
}

// Run the test
testPDFPerformance();