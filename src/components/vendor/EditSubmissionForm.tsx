'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/button/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';
import DatePicker from '@/components/form/DatePicker';
import TimePicker from '@/components/form/TimePicker';
import FileUpload from '@/components/form/FileUpload';
import Alert from '@/components/ui/alert/Alert';
import LoadingSpinner from '@/components/ui/loading/LoadingSpinner';
import { useToast } from '@/hooks/useToast';

interface Submission {
  id: string;
  status_approval_admin: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  jam_kerja: string;
  lain_lain?: string | null;
  sarana_kerja: string;
  nomor_simja?: string | null;
  tanggal_simja?: Date | null;
  nomor_sika?: string | null;
  tanggal_sika?: Date | null;
  nama_pekerja: string;
  content: string | null;
  upload_doc_sika?: string | null;
  upload_doc_simja?: string | null;
}

interface EditSubmissionFormProps {
  submissionId: string;
}

export default function EditSubmissionForm({ submissionId }: EditSubmissionFormProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string } | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  
  // Load submission data
  useEffect(() => {
    const fetchSubmission = async () => {
      setIsInitialLoading(true);
      try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (response.ok) {
          const data = await response.json();
          setSubmission(data);
        } else {
          setAlert({
            variant: 'error',
            title: 'Error!',
            message: 'Gagal memuat data pengajuan'
          });
        }
      } catch (error) {
        console.error('Error fetching submission:', error);
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: 'Gagal memuat data pengajuan'
        });
      } finally {
        setIsInitialLoading(false);
      }
    };
    
    if (submissionId) {
      fetchSubmission();
    }
  }, [submissionId]);

  const [formData, setFormData] = useState({
    nama_vendor: '',
    berdasarkan: '',
    nama_petugas: '',
    pekerjaan: '',
    lokasi_kerja: '',
    pelaksanaan: '',
    jam_kerja: '',
    lain_lain: '',
    sarana_kerja: '',
    nomor_simja: '',
    tanggal_simja: '',
    nomor_sika: '',
    tanggal_sika: '',
    nama_pekerja: '',
    content: '',
    upload_doc_sika: '',
    upload_doc_simja: '',
  });

  // Update form data when submission is loaded
  useEffect(() => {
    if (submission) {
      setFormData({
        nama_vendor: submission.nama_vendor || '',
        berdasarkan: submission.berdasarkan || '',
        nama_petugas: submission.nama_petugas || '',
        pekerjaan: submission.pekerjaan || '',
        lokasi_kerja: submission.lokasi_kerja || '',
        pelaksanaan: submission.pelaksanaan || '',
        jam_kerja: submission.jam_kerja || '',
        lain_lain: submission.lain_lain || '',
        sarana_kerja: submission.sarana_kerja || '',
        nomor_simja: submission.nomor_simja || '',
        tanggal_simja: submission.tanggal_simja ? (() => {
          const date = new Date(submission.tanggal_simja);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nomor_sika: submission.nomor_sika || '',
        tanggal_sika: submission.tanggal_sika ? (() => {
          const date = new Date(submission.tanggal_sika);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nama_pekerja: submission.nama_pekerja || '',
        content: submission.content || '',
        upload_doc_sika: submission.upload_doc_sika || '',
        upload_doc_simja: submission.upload_doc_simja || '',
      });
    }
  }, [submission]);
  
  // Auto-fill form data when session is available (for readonly fields)
  useEffect(() => {
    if (session?.user && submission) {
      setFormData(prev => ({
        ...prev,
        // Keep vendor name readonly for vendors - use session data if available
        nama_vendor: session.user.nama_vendor || submission.nama_vendor || prev.nama_vendor || '',
      }));
    }
  }, [session, submission]);

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
    
    // Check if submission is loaded
    if (!submission) {
      setAlert({
        variant: 'error',
        title: 'Error!',
        message: 'Data pengajuan belum dimuat'
      });
      return;
    }
    
    // Check if submission is still editable
    if (submission.status_approval_admin !== 'PENDING') {
      setAlert({
        variant: 'warning',
        title: 'Peringatan!',
        message: 'Tidak dapat mengubah pengajuan yang sudah diproses oleh admin.'
      });
      return;
    }
    
    // Client-side validation
    const requiredFields = [
      'nama_vendor', 'berdasarkan', 'nama_petugas', 'pekerjaan', 
      'lokasi_kerja', 'jam_kerja', 'sarana_kerja', 'nama_pekerja'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof typeof formData] || formData[field as keyof typeof formData].trim() === '') {
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: `Field ${field} harus diisi!`
        });
        return;
      }
    }
    
    setIsLoading(true);

    try {
      // Format nama pekerja before sending
      const formattedData = {
        ...formData,
        nama_pekerja: formatNamaPekerja(formData.nama_pekerja)
      };

      console.log('Sending update request:', {
        url: `/api/submissions/${submission.id}`,
        method: 'PUT',
        data: formattedData
      });

      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formattedData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        let errorMessage;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || 'Gagal menyimpan perubahan';
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: `Error: ${errorMessage}`
        });
        showError('Gagal Menyimpan', errorMessage);
        return;
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
      // Show success toast and redirect immediately
      showSuccess('Berhasil!', 'Perubahan berhasil disimpan!');
      
      // Redirect immediately without delay
      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Network/unexpected error:', error);
      
      let errorMessage = 'Terjadi kesalahan tidak terduga';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setAlert({
        variant: 'error',
        title: 'Error!',
        message: `Gagal menyimpan perubahan: ${errorMessage}`
      });
      showError('Error!', `Gagal menyimpan perubahan: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {isInitialLoading ? (
        <Card>
          <div className="p-6 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600">Memuat data pengajuan...</p>
          </div>
        </Card>
      ) : !submission ? (
        <Card>
          <div className="p-6 text-center">
            <p className="text-red-600">Data pengajuan tidak ditemukan</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Edit Pengajuan SIMLOK</h1>
              <div className="text-sm text-gray-500">
                Status: <span className={`font-medium ${
                  submission.status_approval_admin === 'PENDING' ? 'text-yellow-600' :
                  submission.status_approval_admin === 'APPROVED' ? 'text-green-600' :
                  'text-red-600'
                }`}>{submission.status_approval_admin}</span>
              </div>
            </div>
            
            {submission.status_approval_admin !== 'PENDING' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Peringatan:</span> Pengajuan ini sudah diproses oleh admin dan tidak dapat diubah.
                  Anda hanya dapat melihat detailnya saja.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <fieldset disabled={submission.status_approval_admin !== 'PENDING'} className={submission.status_approval_admin !== 'PENDING' ? 'opacity-60' : ''}>
            
            {/* Informasi Vendor Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informasi Vendor</h3>
              
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
                  <p className="text-xs text-gray-500 mt-1">
                    {session?.user?.nama_vendor ? "Nama vendor tidak dapat diubah" : ""}
                  </p>
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
              </div>

              {/* SIMJA Section */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-700">Dokumen SIMJA</h4>
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
                <h4 className="text-md font-medium text-gray-700">Dokumen SIKA</h4>
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

              {/* Upload Dokumen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FileUpload
                  id="upload_doc_simja"
                  name="upload_doc_simja"
                  label="Upload Dokumen SIMJA"
                  description="Upload dokumen SIMJA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                  value={formData.upload_doc_simja}
                  onChange={handleFileUpload('upload_doc_simja')}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  maxSize={5}
                  required={false}
                />

                <FileUpload
                  id="upload_doc_sika"
                  name="upload_doc_sika"
                  label="Upload Dokumen SIKA"
                  description="Upload dokumen SIKA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                  value={formData.upload_doc_sika}
                  onChange={handleFileUpload('upload_doc_sika')}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  maxSize={5}
                  required={false}
                />
              </div>
            </div>

            {/* Informasi Pekerjaan Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Informasi Pekerjaan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                <div>
                  <Label htmlFor="sarana_kerja">Sarana Kerja *</Label>
                  <textarea
                    id="sarana_kerja"
                    name="sarana_kerja"
                    value={formData.sarana_kerja}
                    onChange={handleChange}
                    required
                    rows={2}
                    placeholder="Contoh: Toolkit lengkap, APD standar, crane mobile"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Daftar nama pekerja Section */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Daftar nama pekerja</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nama_pekerja">Nama Pekerja *</Label>
                  <textarea
                    id="nama_pekerja"
                    name="nama_pekerja"
                    value={formData.nama_pekerja}
                    onChange={handleChange}
                    required
                    rows={5}
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

                <div className="flex flex-col justify-center items-center border-2 border-dashed border-gray-300 rounded-lg p-6 min-h-[200px]">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">Placeholder untuk foto pekerja</p>
                    <p className="text-gray-400 text-xs mt-1">Fitur upload foto akan tersedia nanti</p>
                  </div>
                </div>
              </div>
            </div>

            </fieldset>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Batal
              </Button>
              {submission.status_approval_admin === 'PENDING' && (
                <Button
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              )}
            </div>
          </form>

          {/* Alert */}
          {alert && (
            <Alert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
            />
          )}
        </div>
      </Card>
      )}
    </div>
  );
}
