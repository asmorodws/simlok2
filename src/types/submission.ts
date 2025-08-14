export interface SubmissionData {
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string;
  jam_kerja: string;
  lain_lain?: string;
  sarana_kerja: string;
  nomor_simja?: string;
  tanggal_simja?: string;
  nomor_sika?: string;
  tanggal_sika?: string;
  nama_pekerja: string;
  content?: string;
  upload_doc_sika?: string;
  upload_doc_simja?: string;
  upload_doc_id_card?: string;
}

export interface SubmissionApprovalData {
  status_approval_admin: 'APPROVED' | 'REJECTED';
  keterangan?: string;
  nomor_simlok?: string;
  tanggal_simlok?: string;
  tembusan?: string;
}

export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
