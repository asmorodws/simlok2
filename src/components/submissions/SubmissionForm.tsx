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
import EnhancedFileUpload from '@/components/form/EnhancedFileUpload';
import Alert from "../ui/alert/Alert";
import { useToast } from '@/hooks/useToast';
import { SubmissionData } from '@/types/submission';

// Define Worker interface for dynamic inputs
interface Worker {
  id: string;
  worker_name: string;
  worker_photo: string;
}

export default function SubmissionForm() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [alert, setAlert] = useState<{ variant: 'success' | 'error' | 'warning' | 'info', title: string, message: string } | null>(null);

  const { data: session } = useSession();

  // State for dynamic workers
  const [workers, setWorkers] = useState<Worker[]>([
    { id: '1', worker_name: '', worker_photo: '' }
  ]);

  // Auto-fill form data when session is available
  useEffect(() => {
    if (session?.user) {
      console.log('Session user data:', session.user); // Debug log
      setFormData(prev => ({
        ...prev,
        vendor_name: session.user.vendor_name || prev.vendor_name || '',
        officer_name: session.user.officer_name || prev.officer_name || '',
      }));
    }
  }, [session]);

  
  const [formData, setFormData] = useState<SubmissionData>({
    vendor_name: '',
    based_on: '',
    officer_name: '',
    job_description: '',
    work_location: '',
    working_hours: '',
    work_facilities: '',
    worker_count: 0,
    simja_number: '',
    simja_date: '',
    sika_number: '',
    sika_date: '',
    worker_names: '',
    sika_document_upload: '',
    simja_document_upload: '',
  });

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
      working_hours: value
    }));
  };

  // Functions for managing dynamic workers
  const addWorker = () => {
    const newWorker: Worker = {
      id: Date.now().toString(),
      worker_name: '',
      worker_photo: ''
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
      worker.id === id ? { ...worker, worker_name: nama } : worker
    ));
  };

  const updateWorkerPhoto = (id: string, foto: string) => {
    setWorkers(prev => prev.map(worker =>
      worker.id === id ? { ...worker, worker_photo: foto } : worker
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate workers
      const validWorkers = workers.filter(worker => worker.worker_name.trim() !== '');
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
      const workersWithoutPhoto = validWorkers.filter(worker => !worker.worker_photo.trim());
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
      const workerNames = validWorkers.map(worker => worker.worker_name.trim()).join('\n');

      // Prepare submission data
      const formattedData = {
        ...formData,
        worker_names: workerNames,
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
                  <Label htmlFor="vendor_name">Nama Vendor</Label>
                  <Input
                    id="vendor_name"
                    name="vendor_name"
                    type="text"
                    value={session?.user?.vendor_name || formData.vendor_name || ''}
                    onChange={handleChange}
                    required
                    disabled={!!session?.user?.vendor_name}
                    placeholder="Masukkan nama vendor"
                    className={session?.user?.vendor_name ? "cursor-not-allowed bg-gray-50" : ""}
                  />
                </div>

                <div>
                  <Label htmlFor="officer_name">Nama Petugas</Label>
                  <Input
                    id="officer_name"
                    name="officer_name"
                    type="text"
                    value={formData.officer_name || ''}
                    onChange={handleChange}
                    required
                    placeholder="Nama petugas yang bertanggung jawab"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="based_on">Berdasarkan</Label>
                  <Input
                    id="based_on"
                    name="based_on"
                    type="text"
                    value={formData.based_on}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Surat Izin Kerja No. 123/2024"
                  />
                </div>

                {/* Document Numbers */}
                <div>
                  <Label htmlFor="simja_number">Nomor SIMJA</Label>
                  <Input
                    id="simja_number"
                    name="simja_number"
                    type="text"
                    value={formData.simja_number || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: SIMJA/2024/001"
                  />
                </div>

                <div>
                  <Label htmlFor="sika_number">Nomor SIKA</Label>
                  <Input
                    id="sika_number"
                    name="sika_number"
                    type="text"
                    value={formData.sika_number || ''}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: SIKA/2024/001"
                  />
                </div>

                <div>
                  <Label htmlFor="simja_date">Tanggal SIMJA</Label>
                  <DatePicker
                    id="simja_date"
                    name="simja_date"
                    value={formData.simja_date || ''}
                    onChange={handleDateChange('simja_date')}
                    placeholder="Pilih tanggal SIMJA"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sika_date">Tanggal SIKA</Label>
                  <DatePicker
                    id="sika_date"
                    name="sika_date"
                    value={formData.sika_date || ''}
                    onChange={handleDateChange('sika_date')}
                    placeholder="Pilih tanggal SIKA"
                    required
                  />
                </div>

                {/* File Upload Areas */}
                <div className="space-y-2">
                  <Label htmlFor="simja_document_upload">UPLOAD DOKUMEN SIMJA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="simja_document_upload"
                      name="simja_document_upload"
                      value={formData.simja_document_upload || ''}
                      onChange={handleFileUpload('simja_document_upload')}
                      uploadType="document"
                      label=""
                      description="Upload dokumen SIMJA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 8MB"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sika_document_upload">UPLOAD DOKUMEN SIKA</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                    <EnhancedFileUpload
                      id="sika_document_upload"
                      name="sika_document_upload"
                      value={formData.sika_document_upload || ''}
                      onChange={handleFileUpload('sika_document_upload')}
                      uploadType="document"
                      required
                      label=""
                      description="Upload dokumen SIKA dalam format PDF, DOC, DOCX, atau gambar (JPG, PNG) maksimal 8MB"
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
                     <Label htmlFor="job_description">Pekerjaan</Label>
                  <Input
                    id="job_description"
                    name="job_description"
                    type="text"
                    value={formData.job_description}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Instalasi dan pemeliharaan peralatan"
                  />
                </div>

                <div>
                     <Label htmlFor="work_location">Lokasi Kerja</Label>
                  <Input
                    id="work_location"
                    name="work_location"
                    type="text"
                    value={formData.work_location}
                    onChange={handleChange}
                    required
                    placeholder="Contoh: Area Produksi Unit 1, Kilang Cilacap"
                  />
                </div>

                <div>
                  <Label htmlFor="working_hours">Jam kerja</Label>
                  <TimePicker
                    id="working_hours"
                    name="working_hours"
                    value={formData.working_hours}
                    onChange={handleTimeChange}
                    required
                    placeholder="Pilih jam kerja"
                  />
                </div>

                <div>
                  <Label htmlFor="work_facilities">Sarana kerja</Label>
                  <Input
                    id="work_facilities"
                    name="work_facilities"
                    value={formData.work_facilities}
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
                  {/* <p className="text-sm text-gray-500 mt-2">Total: {workers.length} pekerja</p> */}
                </div>
               
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label htmlFor="worker_count">Jumlah Pekerja</Label>
                  <Input
                    id="worker_count"
                    name="worker_count"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.worker_count || ''}
                    onChange={handleChange}
                    placeholder="Masukkan jumlah pekerja"
                    required
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Jumlah total pekerja yang akan bekerja di lokasi ini
                  </p>
                </div>
                <div className="flex items-end">
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <div className="font-medium mb-1">Info:</div>
                    <div>Pekerja yang diinput: {workers.length}</div>
                    <div>Jumlah pekerja: {formData.worker_count || 0}</div>
                    {formData.worker_count && workers.length !== Number(formData.worker_count) && (
                      <div className="text-orange-600 mt-1">
                        ⚠️ Jumlah tidak sesuai dengan daftar pekerja
                      </div>
                    )}
                  </div>
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
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                    
                    {/* Photo Preview */}
                    <div className="mb-4">

                      <div className="relative">
                        {worker.worker_photo ? (
                          <div className="relative group">
                            <img 
                              src={worker.worker_photo} 
                              alt={`Foto ${worker.worker_name || 'pekerja'}`}
                              className="w-full h-50 object-cover rounded-lg border-2 border-gray-300"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById(`worker_photo_${worker.id}`)?.click()}
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
                          <div className="w-full h-50  rounded-lg flex flex-col items-center justify-center bg-gray-50">
                            <EnhancedFileUpload
                              id={`worker_photo_${worker.id}`}
                              name={`worker_photo_${worker.id}`}
                              value={worker.worker_photo}
                              onChange={(url) => updateWorkerPhoto(worker.id, url)}
                              uploadType="worker-photo"
                              workerName={worker.worker_name || `Pekerja ${worker.id}`}
                              required={false}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Name Input */}
                    <div>
                      <Input
                        id={`worker_name_${worker.id}`}
                        name={`worker_name_${worker.id}`}
                        type="text"
                        value={worker.worker_name}
                        onChange={(e) => updateWorkerName(worker.id, e.target.value)}
                        required
                        placeholder="Masukkan nama lengkap"
                      />
                    </div>
                    
                    {/* Status Indicator */}
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        worker.worker_name.trim() && worker.worker_photo.trim()
                          ? 'bg-green-400' 
                          : 'bg-red-400'
                      }`}></div>
                      <span className={`text-xs ${
                        worker.worker_name.trim() && worker.worker_photo.trim()
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {worker.worker_name.trim() && worker.worker_photo.trim()
                          ? 'Lengkap' 
                          : worker.worker_name.trim() 
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
