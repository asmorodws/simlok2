'use client';

import { useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui';
import { useToast } from '@/hooks/useToast';
import { generateQrString } from '@/lib/qr-security';

interface QRGeneratorProps {
  data?: string;
}

export default function QRGenerator({ data = 'cmeg7fce10003silbg30j9em8' }: QRGeneratorProps) {
  const [qrText, setQrText] = useState(data);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQrString, setGeneratedQrString] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showSuccess, showError } = useToast();

  const generateSecureQR = () => {
    try {
      // Generate proper QR format using the security function
      const qrString = generateQrString({
        id: qrText,
        implementation_start_date: new Date(),
        implementation_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      });
      
      setQrText(qrString);
      setGeneratedQrString(qrString);
      showSuccess("Secure QR Generated", "QR dengan format yang benar telah dibuat");
    } catch (error) {
      console.error('Error generating secure QR:', error);
      showError("Error", "Gagal membuat secure QR");
    }
  };

  const generateQRCode = async () => {
    if (!qrText.trim()) {
      showError("Error", "Masukkan teks untuk QR code");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = canvasRef.current;
      if (canvas) {
        await QRCode.toCanvas(canvas, qrText, {
          errorCorrectionLevel: 'M',
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 200
        });

        // Also generate data URL for download
        const dataUrl = await QRCode.toDataURL(qrText, {
          errorCorrectionLevel: 'M',
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 300
        });
        setQrCodeUrl(dataUrl);

        showSuccess("QR Code Generated", "QR code berhasil dibuat. Coba scan dengan scanner!");
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      showError("Error", "Gagal membuat QR code");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `qr-code-${Date.now()}.png`;
      link.href = qrCodeUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const copyText = () => {
    navigator.clipboard.writeText(qrText).then(() => {
      showSuccess("Copied", "Teks QR code berhasil disalin");
    });
  };

  const sampleData = [
    { label: 'Sample Submission ID (Raw)', value: 'cmeg7fce10003silbg30j9em8' },
    { label: 'Another Submission (Raw)', value: 'cmevi912t0002si34tkyfb4vr' },
    { label: 'New Ultra-Short QR Format', value: 'SL:cmeg7fce10003silbg30j9em8:1758047684671:b0915b' },
    { label: 'Old Base64 Format (Legacy)', value: 'SL|eyJpZCI6ImNtZWc3ZmNlMTAwMDNzaWxiZzMwajllbTgiLCJleHAiOjE3NTgwNDc2ODQ2NzEsInNpZyI6ImIwOTE1YmVjIn0=' },
    { label: 'Simple Test Data', value: 'test-submission-123' },
    { label: 'Website URL', value: 'https://example.com/submission/test' }
  ];

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          QR Code Generator
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Buat QR code untuk test scanner
        </p>
      </div>
      
      <div className="p-6">
        {/* Input Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data QR Code
          </label>
          <textarea
            value={qrText}
            onChange={(e) => setQrText(e.target.value)}
            placeholder="Masukkan teks atau data untuk QR code..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 resize-none"
            rows={3}
          />
        </div>

        {/* Sample Data */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data Contoh
          </label>
          <div className="grid grid-cols-1 gap-2">
            {sampleData.map((sample, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setQrText(sample.value)}
                className="justify-start text-left h-auto py-2"
              >
                <div>
                  <div className="font-medium">{sample.label}</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">
                    {sample.value}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={generateQRCode} 
            disabled={isGenerating || !qrText.trim()}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate QR Code'}
          </Button>
          <Button 
            variant="outline" 
            onClick={generateSecureQR}
          >
            Generate Secure QR
          </Button>
          <Button 
            variant="outline" 
            onClick={copyText}
            disabled={!qrText.trim()}
          >
            Copy Text
          </Button>
        </div>

        {/* Generated QR String Info */}
        {generatedQrString && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <label className="block text-sm font-medium text-blue-800 mb-1">
              Generated Secure QR String:
            </label>
            <code className="text-xs text-blue-700 break-all block bg-white p-2 rounded border">
              {generatedQrString}
            </code>
          </div>
        )}

        {/* QR Code Display */}
        <div className="text-center">
          <canvas
            ref={canvasRef}
            className="mx-auto border border-gray-200 rounded"
            style={{ display: qrCodeUrl ? 'block' : 'none' }}
          />
          
          {qrCodeUrl && (
            <div className="mt-4">
              <Button variant="outline" onClick={downloadQRCode} size="sm">
                Download QR Code
              </Button>
            </div>
          )}
          
          {!qrCodeUrl && (
            <div className="py-8 text-gray-500">
              QR code akan muncul di sini setelah generate
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
