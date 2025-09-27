'use client';

import { useState } from 'react';
import { QrCodeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { Button } from '../ui';

export default function QRTestHelper() {
  const [submissionId, setSubmissionId] = useState('');
  const [qrData, setQrData] = useState('');

  const generateTestQR = () => {
    if (!submissionId.trim()) {
      alert('Masukkan ID submission terlebih dahulu');
      return;
    }

    // Generate QR data format yang sama dengan sistem
    const qrContent = JSON.stringify({
      submissionId: submissionId.trim(),
      type: 'simlok',
      timestamp: new Date().toISOString()
    });

    setQrData(qrContent);
  };

  const copyToClipboard = () => {
    if (qrData) {
      navigator.clipboard.writeText(qrData);
      alert('Data QR berhasil disalin ke clipboard!');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <QrCodeIcon className="w-5 h-5 mr-2" />
        Test QR Scanner
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ID Submission untuk Test
          </label>
          <input
            type="text"
            value={submissionId}
            onChange={(e) => setSubmissionId(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Masukkan ID submission yang valid..."
          />
        </div>
        
        <Button
          onClick={generateTestQR}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Generate Test QR Data
        </Button>
        
        {qrData && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium text-gray-900">
                Data QR untuk Test:
              </h4>
              <Button
                onClick={copyToClipboard}
                variant="outline"
                size="sm"
              >
                <DocumentDuplicateIcon className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            
            <div className="bg-white p-3 rounded border text-xs font-mono text-gray-800 break-all">
              {qrData}
            </div>
            
            <p className="mt-2 text-xs text-gray-500">
              Gunakan data ini di "Input Manual" pada scanner untuk test
            </p>
          </div>
        )}
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h5 className="text-sm font-medium text-blue-800 mb-2">
            Cara testing scanner:
          </h5>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Masukkan ID submission yang valid (lihat di database)</li>
            <li>Klik "Generate Test QR Data"</li>
            <li>Copy data yang dihasilkan</li>
            <li>Buka scanner dan pilih "Input Manual"</li>
            <li>Paste data yang sudah dicopy</li>
            <li>Scanner akan memproses seperti scan QR code asli</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
