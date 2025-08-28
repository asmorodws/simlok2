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
import Alert from "../ui/alert/Alert";
import { useToast } from '@/hooks/useToast';
import { SubmissionData, DaftarPekerja } from '@/types/submission';

// Define Worker interface for dynamic inputs
interface Worker {
  id: string;
  nama_pekerja: string;
  foto_pekerja: string;
}

export default function SubmissionForm() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string } | null>(null);

  const { data: session } = useSession();

  // State for dynamic workers
  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', nama_pekerja: '', foto_pekerja: '' }
  ]);

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

      // Prepare submission data
      const formattedData = {
        ...formData,
        nama_pekerja: workerNames,
        workers: validWorkers // Include workers data for API processing
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

      // Show success toast and redirect
      showSuccess('Berhasil!', 'Pengajuan SIMLOK berhasil dibuat!');
      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Error creating submission:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create submission. Please try again.';
      showError('Error!', errorMessage);
      setAlert({
        variant: 'error',
        title: 'Error!',
        message: errorMessage
      });
      setTimeout(() => setAlert(null), 5000);
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
          {/* <h1 className="text-2xl font-bold mb-6">Buat Pengajuan Baru</h1> */}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informasi Vendor */}
            <div className="p-6 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">Informasi Vendor</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="nama_vendor">Nama vendor</Label>
                  <Input
                    id="nama_vendor"
                    name="nama_vendor"
                    value={session?.user?.nama_vendor || formData.nama_vendor || ''}
                    onChange={handleChange}
                    required
                    readOnly={!!session?.user?.nama_vendor}
                    disabled={!!session?.user?.nama_vendor}
                    className={session?.user?.nama_vendor ? " cursor-not-allowed" : ""}
                  />
                </div>

                <div>
                  <Label htmlFor="nama_petugas">Nama petugas</Label>
                  <Input
                    id="nama_petugas"
                    name="nama_petugas"
                    value={session?.user?.nama_petugas || formData.nama_petugas || ''}
                    onChange={handleChange}
                    required
                    readOnly={!!session?.user?.nama_petugas}
                    disabled={!!session?.user?.nama_petugas}
                    className={session?.user?.nama_petugas ? " cursor-not-allowed" : ""}
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
                      required
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
                      required
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
                {workers.map((worker, index) => (
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
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(`foto_pekerja_${worker.id}`)?.click()}
                                className="bg-white text-gray-800 hover:bg-gray-100 text-xs px-3 py-1"
                              >
                                Ganti Foto
                              </Button>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateWorkerPhoto(worker.id, '')}
                              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                              title="Hapus foto"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => document.getElementById(`foto_pekerja_${worker.id}`)?.click()}
                            className="w-full h-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 bg-gray-50"
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
                <div 
                  onClick={addWorker}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[280px] text-gray-500 hover:text-blue-600"
                >
                  <div className="text-4xl mb-2">➕</div>
                  <p className="text-sm font-medium">Tambah Pekerja Baru</p>
                  <p className="text-xs mt-1">Klik untuk menambah</p>
                </div>
              </div>
            
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

      {/* Alert */}
      {alert && (
        <Alert
          variant={alert.variant}
          title={alert.title}
          message={alert.message}
        />
      )}
    </div>
  );
}
