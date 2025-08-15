'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import DatePicker from '@/components/form/DatePicker';
import TimePicker from '@/components/form/TimePicker';
import FileUpload from '@/components/form/FileUpload';
import { SubmissionData } from '@/types/submission';
import { useSession } from 'next-auth/react';
export default function SubmissionForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const { data: session } = useSession();

  // Auto-fill form data when session is available
  useEffect(() => {
    if (session?.user) {
      console.log('Session user data:', session.user); // Debug log
      setFormData(prev => ({
        ...prev,
        nama_vendor: session.user.nama_vendor || prev.nama_vendor || '',
        nama_petugas: session.user.nama_petugas || prev.nama_petugas || '',
      }));
    }
  }, [session]);

  
  const [formData, setFormData] = useState<SubmissionData>({
    nama_vendor: '',
    berdasarkan: '',
    nama_petugas: '',
    pekerjaan: '',
    lokasi_kerja: '',
    jam_kerja: '',
    sarana_kerja: '',
    nomor_simja: '',
    tanggal_simja: '',
    nomor_sika: '',
    tanggal_sika: '',
    nama_pekerja: '',
    upload_doc_sika: '',
    upload_doc_simja: '',
    upload_doc_id_card: '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      // For now, just store the file name. In production, you'd upload to a file storage service
      setFormData(prev => ({
        ...prev,
        [name]: files[0].name
      }));
    }
  };

  // Handle file upload from FileUpload component
  const handleFileUpload = (fieldName: string) => (url: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: url
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name: string) => (value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      jam_kerja: value
    }));
  };

  // Function to format multiple names with line breaks for display
  const formatNamaPekerjaDisplay = (names: string): string[] => {
    // Split by newlines or commas, clean up each name, and return as array
    return names
      .split(/[\n,]+/) // Split by newlines or commas
      .map(name => name.trim()) // Remove whitespace
      .filter(name => name.length > 0); // Remove empty strings
  };

  // Function to format multiple names for database (with line breaks)
  const formatNamaPekerja = (names: string): string => {
    // Split by newlines or commas, clean up each name, and rejoin with line breaks
    return names
      .split(/[\n,]+/) // Split by newlines or commas
      .map(name => name.trim()) // Remove whitespace
      .filter(name => name.length > 0) // Remove empty strings
      .join('\n'); // Join with line breaks for database
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Format nama pekerja before sending
      const formattedData = {
        ...formData,
        nama_pekerja: formatNamaPekerja(formData.nama_pekerja)
      };

      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create submission');
      }

      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Error creating submission:', error);
      alert('Failed to create submission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Debug info - remove in production */}
      {/* {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800">Debug Session Info:</h3>
          <pre className="text-sm text-yellow-700 mt-2">
            {JSON.stringify({
              userId: session?.user?.id,
              nama_petugas: session?.user?.nama_petugas,
              nama_vendor: session?.user?.nama_vendor,
              role: session?.user?.role,
              email: session?.user?.email
            }, null, 2)}
          </pre>
        </div>
      )} */}
      
      <Card>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6">Buat Pengajuan Baru</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nama_vendor">Nama Vendor *</Label>
                <Input
                  id="nama_vendor"
                  name="nama_vendor"
                  value={session?.user?.nama_vendor || formData.nama_vendor || ''}
                  onChange={handleChange}
                  required
                  readOnly={!!session?.user?.nama_vendor}
                  disabled={!!session?.user?.nama_vendor}
                  className={session?.user?.nama_vendor ? "bg-gray-50 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <Label htmlFor="berdasarkan">Berdasarkan *</Label>
                <Input
                  id="berdasarkan"
                  name="berdasarkan"
                  value={formData.berdasarkan}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nama_petugas">Nama Petugas *</Label>
                <Input
                  id="nama_petugas"
                  name="nama_petugas"
                  value={formData.nama_petugas}
                  onChange={handleChange}
                  required
                  placeholder="Nama petugas yang bertanggung jawab"
                />
              </div>

              <div>
                <Label htmlFor="pekerjaan">Pekerjaan *</Label>
                <Input
                  id="pekerjaan"
                  name="pekerjaan"
                  value={formData.pekerjaan}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="lokasi_kerja">Lokasi Kerja *</Label>
                <Input
                  id="lokasi_kerja"
                  name="lokasi_kerja"
                  value={formData.lokasi_kerja}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="jam_kerja">Jam Kerja *</Label>
                <TimePicker
                  id="jam_kerja"
                  name="jam_kerja"
                  value={formData.jam_kerja}
                  onChange={handleTimeChange}
                  required
                  placeholder="Pilih jam kerja"
                />
              </div>

              {/* Nama Pekerja dan Sarana Kerja - sejajar */}
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="nama_pekerja">Nama Pekerja *</Label>
                    <textarea
                      id="nama_pekerja"
                      name="nama_pekerja"
                      value={formData.nama_pekerja}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="Masukkan nama pekerja (pisahkan dengan enter atau koma)&#10;Contoh:&#10;Ahmad Budi&#10;Siti Aisyah&#10;atau: Ahmad Budi, Siti Aisyah, Joko Widodo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Tip: Pisahkan nama dengan enter atau koma. Akan ditampilkan satu nama per baris.
                    </p>
                    {formData.nama_pekerja && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-700 font-medium mb-2">Preview tampilan:</p>
                        <div className="text-sm text-blue-800 space-y-1">
                          {formatNamaPekerjaDisplay(formData.nama_pekerja).map((name, index) => (
                            <div key={index} className="flex items-center">
                              <span className="w-4 text-blue-600">{index + 1}.</span>
                              <span className="ml-2">{name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="sarana_kerja">Sarana Kerja *</Label>
                    <textarea
                      id="sarana_kerja"
                      name="sarana_kerja"
                      value={formData.sarana_kerja}
                      onChange={handleChange}
                      required
                      rows={3}
                      placeholder="Contoh: Toolkit lengkap, APD standar, crane mobile"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* SIMJA Section */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900 border-b pb-2">Dokumen SIMJA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nomor_simja">Nomor SIMJA</Label>
                  <Input
                    id="nomor_simja"
                    name="nomor_simja"
                    value={formData.nomor_simja}
                    onChange={handleChange}
                    placeholder="Contoh: SIMJA/2024/001"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_simja">Tanggal SIMJA</Label>
                  <DatePicker
                    id="tanggal_simja"
                    name="tanggal_simja"
                    value={formData.tanggal_simja}
                    onChange={handleDateChange('tanggal_simja')}
                    placeholder="Pilih tanggal SIMJA"
                  />
                </div>
              </div>
            </div>

            {/* SIKA Section */}
            <div className="space-y-4">
              <h3 className="text-md font-semibold text-gray-900 border-b pb-2">Dokumen SIKA</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nomor_sika">Nomor SIKA</Label>
                  <Input
                    id="nomor_sika"
                    name="nomor_sika"
                    value={formData.nomor_sika}
                    onChange={handleChange}
                    placeholder="Contoh: SIKA/2024/001"
                  />
                </div>

                <div>
                  <Label htmlFor="tanggal_sika">Tanggal SIKA</Label>
                  <DatePicker
                    id="tanggal_sika"
                    name="tanggal_sika"
                    value={formData.tanggal_sika}
                    onChange={handleDateChange('tanggal_sika')}
                    placeholder="Pilih tanggal SIKA"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* <div>
                <Label htmlFor="content">Content</Label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div> */}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Upload Dokumen</h3>
              
              <FileUpload
                id="upload_doc_sika"
                name="upload_doc_sika"
                label="Upload Dokumen SIKA"
                description="Upload dokumen SIKA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                value={formData.upload_doc_sika}
                onChange={handleFileUpload('upload_doc_sika')}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxSize={5}
                required
              />

              <FileUpload
                id="upload_doc_simja"
                name="upload_doc_simja"
                label="Upload Dokumen SIMJA"
                description="Upload dokumen SIMJA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                value={formData.upload_doc_simja}
                onChange={handleFileUpload('upload_doc_simja')}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                maxSize={5}
                required
              />

              <FileUpload
                id="upload_doc_id_card"
                name="upload_doc_id_card"
                label="Upload ID Card"
                description="Upload foto ID Card (KTP/SIM/Passport) dalam format gambar (JPG, PNG) atau PDF maksimal 5MB"
                value={formData.upload_doc_id_card}
                onChange={handleFileUpload('upload_doc_id_card')}
                accept=".pdf,.jpg,.jpeg,.png"
                maxSize={5}
                required
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Buat Pengajuan'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
