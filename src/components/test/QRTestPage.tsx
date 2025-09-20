'use client';

import { useState } from 'react';
import * as QRCode from 'qrcode';
import { generateQrString, parseQrString } from '@/lib/qr-security';

export default function QRTestPage() {
  const [submissionId, setSubmissionId] = useState('test-submission-123');
  const [qrString, setQrString] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [testResult, setTestResult] = useState('');

  const generateTestQR = async () => {
    try {
      // Generate QR string using the same method as the system
      const generatedQrString = generateQrString({
        id: submissionId,
        implementation_start_date: new Date(),
        implementation_end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      });
      
      setQrString(generatedQrString);
      
      // Generate QR image
      const dataUrl = await QRCode.toDataURL(generatedQrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      setQrImageUrl(dataUrl);
      
      // Test parsing
      const parsed = parseQrString(generatedQrString);
      setTestResult(JSON.stringify(parsed, null, 2));
      
    } catch (error) {
      console.error('Error generating QR:', error);
      setTestResult('Error: ' + error);
    }
  };

  const testParsing = () => {
    if (!qrString) return;
    
    try {
      const parsed = parseQrString(qrString);
      setTestResult(JSON.stringify(parsed, null, 2));
    } catch (error) {
      setTestResult('Error parsing: ' + error);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">QR Code Test Page</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Generator */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Generate QR Code</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Submission ID</label>
              <input
                type="text"
                value={submissionId}
                onChange={(e) => setSubmissionId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter submission ID"
              />
            </div>
            
            <button
              onClick={generateTestQR}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Generate QR Code
            </button>
            
            {qrString && (
              <div>
                <label className="block text-sm font-medium mb-2">Generated QR String</label>
                <textarea
                  value={qrString}
                  onChange={(e) => setQrString(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-24 text-xs font-mono"
                />
              </div>
            )}
            
            <button
              onClick={testParsing}
              disabled={!qrString}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              Test Parsing
            </button>
          </div>
        </div>
        
        {/* Display */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">QR Code & Results</h2>
          
          {qrImageUrl && (
            <div className="mb-4 text-center">
              <img src={qrImageUrl} alt="QR Code" className="mx-auto" />
              <p className="text-sm text-gray-600 mt-2">Scan this QR code with your camera</p>
            </div>
          )}
          
          {testResult && (
            <div>
              <label className="block text-sm font-medium mb-2">Parse Result</label>
              <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto">
                {testResult}
              </pre>
            </div>
          )}
        </div>
      </div>
      
      {/* Format Examples */}
      <div className="mt-8 bg-yellow-50 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">QR Code Format Examples</h3>
        <div className="space-y-2 text-sm">
          <div><strong>New Format:</strong> <code>SL:submissionId:expiration:signature</code></div>
          <div><strong>Old Format:</strong> <code>SL|base64EncodedData</code></div>
          <div><strong>Raw ID:</strong> <code>submissionId</code> (not recommended)</div>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium mb-2">Test Cases:</h4>
          <div className="space-y-1 text-xs font-mono">
            <div>✅ SL:test-123:1695211200000:abc123def456...</div>
            <div>✅ SL|eyJpIjoidGVzdC0xMjMiLCJlIjoxNjk1...</div>
            <div>⚠️ test-submission-123 (raw ID)</div>
          </div>
        </div>
      </div>
    </div>
  );
}