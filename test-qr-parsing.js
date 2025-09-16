// Test QR parsing functionality
import { generateQrString, parseQrString } from './src/lib/qr-security.js';

const sampleSubmission = {
  id: 'cmf9wfenv0002sid11tsws75w',
  implementation_start_date: '2025-09-16',
  implementation_end_date: '2025-09-30'
};

console.log('=== QR PARSING TEST ===\n');

// Generate QR
const qrString = generateQrString(sampleSubmission);
console.log('1. Generated QR String:');
console.log(`   ${qrString}`);
console.log(`   Length: ${qrString.length} characters\n`);

// Parse QR
const parsed = parseQrString(qrString);
console.log('2. Parsed QR Data:');
console.log('   Success:', parsed !== null);
if (parsed) {
  console.log(`   ID: ${parsed.id}`);
  console.log(`   Start Date: ${parsed.start_date}`);
  console.log(`   End Date: ${parsed.end_date}`);
  console.log(`   Timestamp: ${new Date(parsed.timestamp).toISOString()}`);
}

// Test backward compatibility with old format
console.log('\n3. Testing Backward Compatibility:');
const oldFormatQR = 'SL|eyJpIjoiY21mOXdmZW52MDAwMnNpZDExdHN3czc1dyIsImUiOjE3MjY0OTIwODI4ODEsInMiOiJiNWQ1YmQifQ==';
const parsedOld = parseQrString(oldFormatQR);
console.log('   Old format parsing success:', parsedOld !== null);

// Test raw submission ID compatibility  
console.log('\n4. Testing Raw ID Compatibility:');
const rawId = 'cmf9wfenv0002sid11tsws75w';
const parsedRaw = parseQrString(rawId);
console.log('   Raw ID parsing success:', parsedRaw !== null);

console.log('\n✅ All parsing tests completed!');

export {};
