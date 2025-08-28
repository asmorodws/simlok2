export interface SubmissionData {
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan?: string; // akan diisi oleh admin saat approve
  jam_kerja: string;
  lain_lain?: string; // akan diisi oleh admin saat approve
  sarana_kerja: string;
  nomor_simja?: string;
  tanggal_simja?: string;
  nomor_sika?: string;
  tanggal_sika?: string;
  nama_pekerja: string;
  content?: string; // akan diisi oleh admin saat approve
  upload_doc_sika?: string;
  upload_doc_simja?: string;
}

export interface SubmissionApprovalData {
  status_approval_admin: 'APPROVED' | 'REJECTED';
  keterangan?: string;
  nomor_simlok?: string;
  tanggal_simlok?: string;
}

export interface DaftarPekerja {
  id: string;
  nama_pekerja: string;
  foto_pekerja?: string | null;
  submission_id: string;
  created_at: Date;
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
