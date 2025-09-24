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
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useToast } from '@/hooks/useToast';

// Define Worker interface for dynamic inputs
interface Worker {
  id: string;
  nama_pekerja: string;
  foto_pekerja: string;
}

interface Submission {
  id: string;
  approval_status: string;
  vendor_name: string;
  based_on: string;
  officer_name: string;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;
  other_notes?: string | null;
  work_facilities: string;
  worker_count?: number | null;
  simja_number?: string | null;
  simja_date?: Date | null;
  sika_number?: string | null;
  sika_date?: Date | null;
  worker_names: string;
  content: string | null;
  sika_document_upload?: string | null;
  simja_document_upload?: string | null;
}

interface EditSubmissionFormProps {
  submissionId: string;
}

export default function EditSubmissionForm({ submissionId }: EditSubmissionFormProps) {
  const router = useRouter();
  const { data: session, status: _status } = useSession();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string } | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  
  // State for dynamic workers
  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', nama_pekerja: '', foto_pekerja: '' }
  ]);
  
  // Load submission data
  useEffect(() => {
    const fetchSubmission = async () => {
      setIsInitialLoading(true);
      try {
        const response = await fetch(`/api/submissions/${submissionId}`);
        if (response.ok) {
          const data = await response.json();
          setSubmission(data);
          
          // Also fetch workers data
          const workersResponse = await fetch(`/api/submissions/${submissionId}/workers`);
          if (workersResponse.ok) {
            const workersData = await workersResponse.json();
            if (workersData.workers && workersData.workers.length > 0) {
              setWorkers(workersData.workers.map((worker: any) => ({
                id: worker.id,
                nama_pekerja: worker.worker_name || worker.nama_pekerja || '',
                foto_pekerja: worker.worker_photo || worker.foto_pekerja || ''
              })));
            }
          }
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
    jumlah_pekerja: 0,
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
        nama_vendor: submission.vendor_name || '',
        berdasarkan: submission.based_on || '',
        nama_petugas: submission.officer_name || '',
        pekerjaan: submission.job_description || '',
        lokasi_kerja: submission.work_location || '',
        pelaksanaan: submission.implementation || '',
        jam_kerja: submission.working_hours || '',
        lain_lain: submission.other_notes || '',
        sarana_kerja: submission.work_facilities || '',
        jumlah_pekerja: submission.worker_count || 0,
        nomor_simja: submission.simja_number || '',
        tanggal_simja: submission.simja_date ? (() => {
          const date = new Date(submission.simja_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nomor_sika: submission.sika_number || '',
        tanggal_sika: submission.sika_date ? (() => {
          const date = new Date(submission.sika_date);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })() : '',
        nama_pekerja: submission.worker_names || '',
        content: submission.content || '',
        upload_doc_sika: submission.sika_document_upload || '',
        upload_doc_simja: submission.simja_document_upload || '',
      });
    }
  }, [submission]);
  
  // Auto-fill form data when session is available (for readonly fields)
  useEffect(() => {
    if (session?.user && submission) {
      setFormData(prev => ({
        ...prev,
        // Keep vendor name readonly for vendors - use session data if available
        nama_vendor: session.user.vendor_name || submission.vendor_name || prev.nama_vendor || '',
      }));
    }
  }, [session, submission]);

  // Handle file upload from FileUpload component
  const handleFileUpload = (fieldName: string) => (url: string) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: url
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value
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

  // Functions for managing dynamic workers
  const addWorker = () => {
    const newWorker: Worker = {
      id: Date.now().toString(),
      nama_pekerja: '',
      foto_pekerja: ''
    };
    setWorkers(prev => [...prev, newWorker]);
  };

  const removeWorker = (id: string) => {
    if (workers.length > 1) {
      setWorkers(prev => prev.filter(worker => worker.id !== id));
    }
  };

  const updateWorkerName = (id: string, nama: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, nama_pekerja: nama } : worker
    ));
  };

  const updateWorkerPhoto = (id: string, foto: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, foto_pekerja: foto } : worker
    ));
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
    if (submission.approval_status !== 'PENDING') {
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
      const value = formData[field as keyof typeof formData];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
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
      // Validate workers
      const validWorkers = workers.filter(worker => worker.nama_pekerja.trim() !== '');
      if (validWorkers.length === 0) {
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: 'Minimal harus ada satu pekerja yang diisi'
        });
        setIsLoading(false);
        return;
      }

      // Check if all workers have photos
      const workersWithoutPhoto = validWorkers.filter(worker => !worker.foto_pekerja.trim());
      if (workersWithoutPhoto.length > 0) {
        setAlert({
          variant: 'error',
          title: 'Error!',
          message: 'Semua pekerja harus memiliki foto. Silakan upload foto untuk semua pekerja.'
        });
        setIsLoading(false);
        return;
      }

      // Format worker names for database
      const workerNames = validWorkers.map(worker => worker.nama_pekerja.trim()).join('\n');

      // Prepare submission data - transform Indonesian field names to English for API
      const formattedData = {
        vendor_name: formData.nama_vendor,
        based_on: formData.berdasarkan,
        officer_name: formData.nama_petugas,
        job_description: formData.pekerjaan,
        work_location: formData.lokasi_kerja,
        implementation: formData.pelaksanaan,
        working_hours: formData.jam_kerja,
        other_notes: formData.lain_lain,
        work_facilities: formData.sarana_kerja,
        worker_count: formData.jumlah_pekerja,
        simja_number: formData.nomor_simja,
        simja_date: formData.tanggal_simja ? new Date(formData.tanggal_simja) : null,
        sika_number: formData.nomor_sika,
        sika_date: formData.tanggal_sika ? new Date(formData.tanggal_sika) : null,
        worker_names: workerNames,
        content: formData.content,
        sika_document_upload: formData.upload_doc_sika,
        simja_document_upload: formData.upload_doc_simja,
        workers: validWorkers.map(worker => ({
          worker_name: worker.nama_pekerja.trim(),
          worker_photo: worker.foto_pekerja
        }))
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
    <div className="max-w-4xl mx-auto p-6">
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
              <div className="text-sm text-gray-500">
                Status: <span className={`font-medium ${
                  submission.approval_status === 'PENDING' ? 'text-yellow-600' :
                  submission.approval_status === 'APPROVED' ? 'text-green-600' :
                  'text-red-600'
                }`}>{
                  submission.approval_status === 'PENDING' ? 'Menunggu Review' :
                  submission.approval_status === 'APPROVED' ? 'Disetujui' :
                  submission.approval_status === 'REJECTED' ? 'Ditolak' :
                  submission.approval_status
                }</span>
              </div>
            </div>
            
            {submission.approval_status !== 'PENDING' && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  <span className="font-medium">Peringatan:</span> Pengajuan ini sudah diproses oleh admin dan tidak dapat diubah.
                  Anda hanya dapat melihat detailnya saja.
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-8">
              <fieldset disabled={submission.approval_status !== 'PENDING'} className={submission.approval_status !== 'PENDING' ? 'opacity-60' : ''}>
            
            {/* Informasi Vendor */}
            <div className="p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">Informasi Vendor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nama_vendor">Nama vendor</Label>
                  <Input
                    id="nama_vendor"
                    name="nama_vendor"
                    value={session?.user?.vendor_name || formData.nama_vendor || ''}
                    onChange={handleChange}
                    required
                    readOnly={!!session?.user?.vendor_name}
                    disabled={!!session?.user?.vendor_name}
                    className={session?.user?.vendor_name ? "cursor-not-allowed" : ""}
                  />
                </div>

                <div>
                  <Label htmlFor="nama_petugas">Nama petugas</Label>
                  <Input
                    id="nama_petugas"
                    name="nama_petugas"
                    value={formData.nama_petugas}
                    onChange={handleChange}
                    required
                    placeholder="Nama petugas yang bertanggung jawab"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="berdasarkan">Berdasarkan</Label>
                  <Input
                    id="berdasarkan"
                    name="berdasarkan"
                    value={formData.berdasarkan}
                    onChange={handleChange}
                    type='text'
                    required
                  />
                </div>

                {/* Document Numbers */}
                <div>
                  <Label htmlFor="nomor_simja">Nomor SIMJA</Label>
                  <Input
                    id="nomor_simja"
                    name="nomor_simja"
                    value={formData.nomor_simja}
                    onChange={handleChange}
                    placeholder="Contoh: SIMJA/2024/001"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="nomor_sika">Nomor SIKA</Label>
                  <Input
                    id="nomor_sika"
                    name="nomor_sika"
                    value={formData.nomor_sika}
                    onChange={handleChange}
                    placeholder="Contoh: SIKA/2024/001"
                    required
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
                    required
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
                    required
                  />
                </div>

                {/* File Upload Areas */}
                <div className="space-y-2">
                  <Label htmlFor="upload_doc_simja">UPLOAD DOKUMEN SIMJA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <FileUpload
                      id="upload_doc_simja"
                      name="upload_doc_simja"
                      label=""
                      description="Upload dokumen SIMJA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                      value={formData.upload_doc_simja}
                      onChange={handleFileUpload('upload_doc_simja')}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={5}
                      required={false}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="upload_doc_sika">UPLOAD DOKUMEN SIKA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <FileUpload
                      id="upload_doc_sika"
                      name="upload_doc_sika"
                      label=""
                      description="Upload dokumen SIKA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 5MB"
                      value={formData.upload_doc_sika}
                      onChange={handleFileUpload('upload_doc_sika')}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      maxSize={5}
                      required={false}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Informasi Pekerjaan */}
            <div className="p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">Informasi Pekerjaan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="pekerjaan">Pekerjaan</Label>
                  <Input
                    id="pekerjaan"
                    name="pekerjaan"
                    value={formData.pekerjaan}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="lokasi_kerja">Lokasi kerja</Label>
                  <Input
                    id="lokasi_kerja"
                    name="lokasi_kerja"
                    value={formData.lokasi_kerja}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jam_kerja">Jam kerja</Label>
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
                  <Label htmlFor="sarana_kerja">Sarana kerja</Label>
                  <Input
                    id="sarana_kerja"
                    name="sarana_kerja"
                    value={formData.sarana_kerja}
                    onChange={handleChange}
                    placeholder="Contoh: Toolkit lengkap, APD standar, crane mobile"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jumlah_pekerja">Jumlah Pekerja</Label>
                  <Input
                    id="jumlah_pekerja"
                    name="jumlah_pekerja"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.jumlah_pekerja || ''}
                    onChange={handleChange}
                    placeholder="Masukkan jumlah pekerja"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Jumlah total pekerja yang akan bekerja di lokasi ini
                  </p>
                </div>

                <div className="flex items-end">
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg w-full">
                    <div className="font-medium mb-1">Info:</div>
                    <div>Pekerja yang diinput: {workers.length}</div>
                    <div>Jumlah pekerja: {formData.jumlah_pekerja || 0}</div>
                    {formData.jumlah_pekerja && workers.length !== Number(formData.jumlah_pekerja) && (
                      <div className="text-orange-600 mt-1">
                        ⚠️ Jumlah tidak sesuai dengan daftar pekerja
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daftar nama pekerja */}
            <div className="p-6 rounded-lg">
              <div className="flex justify-between items-center mb-6 border-b border-gray-300 ">
                <div className='flex justify-between'>
                  <h2 className="text-lg font-semibold text-gray-900 pb-2">Daftar Nama Pekerja</h2>
                  <p className="text-sm text-gray-500 mt-2">Total: {workers.length} pekerja</p>
                </div>
               
              </div>
              
              {/* Workers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker, _index) => (
                  <div key={worker.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        {/* <div className="bg-blue-100 text-blue-700 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">Pekerja {index + 1}</span> */}
                      </div>
                      {workers.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeWorker(worker.id)}
                          variant="outline"
                          className="text-red-500 hover:bg-red-50 border-red-200 w-8 h-8 p-0 rounded-full"
                          title="Hapus pekerja"
                          disabled={submission.approval_status !== 'PENDING'}
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    
                    {/* Photo Preview */}
                    <div className="mb-4">

                      <div className="relative">
                        {worker.foto_pekerja ? (
                          <div className="relative group">
                            <img 
                              src={worker.foto_pekerja} 
                              alt={`Foto ${worker.nama_pekerja || 'pekerja'}`}
                              className="w-full h-50 object-cover rounded-lg border-2 border-gray-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(`foto_pekerja_${worker.id}`)?.click()}
                                className="bg-white text-gray-800 hover:bg-gray-100 text-xs px-3 py-1"
                                disabled={submission.approval_status !== 'PENDING'}
                              >
                                Ganti Foto
                              </Button>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateWorkerPhoto(worker.id, '')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              title="Hapus foto"
                              disabled={submission.approval_status !== 'PENDING'}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => submission.approval_status === 'PENDING' && document.getElementById(`foto_pekerja_${worker.id}`)?.click()}
                            className={`w-full h-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center transition-all duration-200 bg-gray-50 ${
                              submission.approval_status === 'PENDING' 
                                ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50' 
                                : 'cursor-not-allowed opacity-60'
                            }`}
                          >
                           
                            <p className="text-sm font-medium text-gray-600">Upload Foto Pekerja</p>
                            <p className="text-xs text-gray-500 mt-1">Klik atau drag & drop foto</p>
   
                          </div>
                        )}
                        <FileUpload
                          id={`foto_pekerja_${worker.id}`}
                          name={`foto_pekerja_${worker.id}`}
                          label=""
                          description=""
                          value={worker.foto_pekerja}
                          onChange={(url) => updateWorkerPhoto(worker.id, url)}
                          accept=".jpg,.jpeg,.png"
                          maxSize={5}
                          required={false}
                          className="sr-only"
                        />
                      </div>
                    </div>
                    
                    {/* Name Input */}
                    <div>
                      <Label htmlFor={`nama_pekerja_${worker.id}`} className="text-sm font-medium text-gray-700">
                        Nama Lengkap
                      </Label>
                      <Input
                        id={`nama_pekerja_${worker.id}`}
                        name={`nama_pekerja_${worker.id}`}
                        value={worker.nama_pekerja}
                        onChange={(e) => updateWorkerName(worker.id, e.target.value)}
                        placeholder="Masukkan nama lengkap"
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        worker.nama_pekerja.trim() && worker.foto_pekerja.trim()
                          ? 'bg-green-400' 
                          : 'bg-red-400'
                      }`}></div>
                      <span className={`text-xs ${
                        worker.nama_pekerja.trim() && worker.foto_pekerja.trim()
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {worker.nama_pekerja.trim() && worker.foto_pekerja.trim()
                          ? 'Lengkap' 
                          : worker.nama_pekerja.trim() 
                            ? 'Perlu foto' 
                            : 'Belum lengkap'}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Add New Worker Card */}
                {submission.approval_status === 'PENDING' && (
                  <div 
                    onClick={addWorker}
                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[280px] text-gray-500 hover:text-blue-600"
                  >
                    <div className="text-4xl mb-2">➕</div>
                    <p className="text-sm font-medium">Tambah Pekerja Baru</p>
                    <p className="text-xs mt-1">Klik untuk menambah</p>
                  </div>
                )}
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
              {submission.approval_status === 'PENDING' && (
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
