/**
 * Simple test script to generate a QR code with the new simplified format
 * Run this with: node test-simplified-qr.js
 */

const { generateQrString } = require('./src/lib/qr-security.ts');

// Test submission data
const testSubmission = {
  id: 'test-submission-123',
  implementation_start_date: new Date('2024-01-15'),
  implementation_end_date: new Date('2024-01-30')
};

try {
  const qrString = generateQrString(testSubmission);
  console.log('Generated QR String:', qrString);
  console.log('QR String Length:', qrString.length);
  console.log('QR String Size in Bytes:', Buffer.byteLength(qrString, 'utf8'));
  
  // For comparison, let's see how much shorter this is
  const oldFormatExample = `SIMLOK|${Buffer.from(JSON.stringify({
    id: testSubmission.id,
    start_date: testSubmission.implementation_start_date.toISOString(),
    end_date: testSubmission.implementation_end_date.toISOString(),
    timestamp: Date.now()
  }), 'utf8').toString('base64')}|${crypto.createHash('sha256').update('test').digest('hex')}`;
  
  console.log('\nComparison:');
  console.log('New format length:', qrString.length);
  console.log('Old format would be:', oldFormatExample.length);
  console.log('Reduction:', ((oldFormatExample.length - qrString.length) / oldFormatExample.length * 100).toFixed(1) + '%');
  
} catch (error) {
  console.error('Error generating QR:', error);
}
