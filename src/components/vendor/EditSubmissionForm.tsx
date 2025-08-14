'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/form/Input';
import Label from '@/components/form/Label';

interface Submission {
  id: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string;
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
  upload_doc_id_card?: string | null;
}

interface EditSubmissionFormProps {
  submission: Submission;
}

export default function EditSubmissionForm({ submission }: EditSubmissionFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
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
    tanggal_simja: submission.tanggal_simja ? new Date(submission.tanggal_simja).toISOString().split('T')[0] : '',
    nomor_sika: submission.nomor_sika || '',
    tanggal_sika: submission.tanggal_sika ? new Date(submission.tanggal_sika).toISOString().split('T')[0] : '',
    nama_pekerja: submission.nama_pekerja || '',
    content: submission.content || '',
    upload_doc_sika: submission.upload_doc_sika || '',
    upload_doc_simja: submission.upload_doc_simja || '',
    upload_doc_id_card: submission.upload_doc_id_card || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/submissions/${submission.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update submission');
      }

      router.push('/vendor/submissions');
    } catch (error) {
      console.error('Error updating submission:', error);
      alert('Failed to update submission. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Edit Pengajuan SIMLOK</h1>
            <div className="text-sm text-gray-500">
              Status: <span className="font-medium text-yellow-600">PENDING</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="nama_vendor">Nama Vendor *</Label>
                <Input
                  id="nama_vendor"
                  name="nama_vendor"
                  value={formData.nama_vendor}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="berdasarkan">Berdasarkan *</Label>
                <Input
                  id="berdasarkan"
                  name="berdasarkan"
                  placeholder="Kontrak/SPK/Dokumen referensi"
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
                />
              </div>

              <div>
                <Label htmlFor="pekerjaan">Jenis Pekerjaan *</Label>
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
                <Label htmlFor="pelaksanaan">Waktu Pelaksanaan *</Label>
                <Input
                  id="pelaksanaan"
                  name="pelaksanaan"
                  placeholder="1-31 Januari 2024"
                  value={formData.pelaksanaan}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="jam_kerja">Jam Kerja *</Label>
                <Input
                  id="jam_kerja"
                  name="jam_kerja"
                  placeholder="08:00 - 17:00 WIB"
                  value={formData.jam_kerja}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nama_pekerja">Nama Pekerja *</Label>
                <Input
                  id="nama_pekerja"
                  name="nama_pekerja"
                  placeholder="Tim atau nama individual"
                  value={formData.nama_pekerja}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="nomor_simja">Nomor SIMJA</Label>
                <Input
                  id="nomor_simja"
                  name="nomor_simja"
                  value={formData.nomor_simja}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="tanggal_simja">Tanggal SIMJA</Label>
                <Input
                  id="tanggal_simja"
                  name="tanggal_simja"
                  type="date"
                  value={formData.tanggal_simja}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="nomor_sika">Nomor SIKA</Label>
                <Input
                  id="nomor_sika"
                  name="nomor_sika"
                  value={formData.nomor_sika}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="tanggal_sika">Tanggal SIKA</Label>
                <Input
                  id="tanggal_sika"
                  name="tanggal_sika"
                  type="date"
                  value={formData.tanggal_sika}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sarana_kerja">Sarana Kerja *</Label>
              <textarea
                id="sarana_kerja"
                name="sarana_kerja"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Daftar alat dan perlengkapan yang akan digunakan"
                value={formData.sarana_kerja}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="content">Deskripsi Pekerjaan *</Label>
              <textarea
                id="content"
                name="content"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jelaskan detail pekerjaan yang akan dilakukan"
                value={formData.content}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="lain_lain">Keterangan Lain-lain</Label>
              <textarea
                id="lain_lain"
                name="lain_lain"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Informasi tambahan jika ada"
                value={formData.lain_lain}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Dokumen</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="upload_doc_sika">Dokumen SIKA</Label>
                  <input
                    id="upload_doc_sika"
                    name="upload_doc_sika"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.upload_doc_sika && (
                    <p className="text-sm text-gray-500 mt-1">Current: {formData.upload_doc_sika}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="upload_doc_simja">Dokumen SIMJA</Label>
                  <input
                    id="upload_doc_simja"
                    name="upload_doc_simja"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.upload_doc_simja && (
                    <p className="text-sm text-gray-500 mt-1">Current: {formData.upload_doc_simja}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="upload_doc_id_card">ID Card/KTP</Label>
                  <input
                    id="upload_doc_id_card"
                    name="upload_doc_id_card"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formData.upload_doc_id_card && (
                    <p className="text-sm text-gray-500 mt-1">Current: {formData.upload_doc_id_card}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
