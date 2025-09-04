import * as XLSX from 'xlsx';

interface WorkerData {
  id: string;
  namaLengkap: string;
  foto: string;
  nik: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  agama: string;
  statusPerkawinan: string;
  alamat: string;
  noTelepon: string;
  email: string;
  pendidikanTerakhir: string;
  jabatan: string;
  pengalaman: string;
  keahlianKhusus: string;
  sertifikasi: string;
  catatan: string;
}

interface SubmissionData {
  id: string;
  nomorSurat: string;
  perihal: string;
  tujuan: string;
  tempatPelaksanaan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  statusApproval: string;
  vendorName: string;
  vendorCompany: string;
  vendorEmail: string;
  vendorPhone: string;
  submittedAt: string;
  approvedAt: string;
  totalWorkers: number;
  daftarPekerja: WorkerData[];
  dokumenSika: string;
  dokumenSimja: string;
  catatan: string;
  signerName: string;
  signerTitle: string;
  // Additional fields from current schema
  jamKerja: string;
  saranaKerja: string;
  pelaksanaan: string;
  lainLain: string;
  nomorSimja: string;
  tanggalSimja: string;
  nomorSika: string;
  tanggalSika: string;
  nomorSimlok: string;
  tanggalSimlok: string;
  namaPerkerjaText: string;
  content: string;
  qrcode: string;
  approvedBy: string;
}

interface ExportOptions {
  filename?: string;
  sheetName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const exportSubmissionsToExcel = (data: SubmissionData[], options: ExportOptions = {}) => {
  try {
    const {
      filename = `submissions_export_${new Date().toISOString().split('T')[0]}.xlsx`,
      sheetName = 'Submissions Data',
      dateFrom,
      dateTo
    } = options;

    // Filter data by date if provided
    let filteredData = data;
    if (dateFrom || dateTo) {
      filteredData = data.filter(item => {
        const itemDate = new Date(item.submittedAt);
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        if (fromDate && toDate) {
          // Set time to cover full day range
          fromDate.setHours(0, 0, 0, 0);
          toDate.setHours(23, 59, 59, 999);
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          fromDate.setHours(0, 0, 0, 0);
          return itemDate >= fromDate;
        } else if (toDate) {
          toDate.setHours(23, 59, 59, 999);
          return itemDate <= toDate;
        }
        return true;
      });
    }

    // Transform submissions data for Excel export
    const submissionsData = filteredData.map((item, index) => ({
      'No': index + 1,
      'Nomor SIMLOK': item.nomorSimlok || '-',
      'Tanggal SIMLOK': item.tanggalSimlok || '-',
      'ID Submission': item.id,
      'Nomor Surat/Berdasarkan': item.nomorSurat,
      'Perihal/Pekerjaan': item.perihal,
      'Tujuan/Lokasi Kerja': item.tujuan,
      'Tempat Pelaksanaan': item.tempatPelaksanaan,
      'Pelaksanaan': item.pelaksanaan || '-',
      'Jam Kerja': item.jamKerja,
      'Sarana Kerja': item.saranaKerja,
      'Lain-lain': item.lainLain || '-',
      'Status Approval': item.statusApproval,
      'Nama Vendor/Petugas': item.vendorName,
      'Perusahaan Vendor': item.vendorCompany || '-',
      'Email Vendor': item.vendorEmail,
      'Telepon Vendor': item.vendorPhone || '-',
      'Tanggal Submit': item.submittedAt,
      'Approved By': item.approvedBy || '-',
      'Total Pekerja': item.totalWorkers,
      'Nomor SIMJA': item.nomorSimja || '-',
      'Tanggal SIMJA': item.tanggalSimja || '-',
      'Nomor SIKA': item.nomorSika || '-',
      'Tanggal SIKA': item.tanggalSika || '-',
      'Dokumen SIKA': item.dokumenSika || '-',
      'Dokumen SIMJA': item.dokumenSimja || '-',
      'Catatan': item.catatan || '-',
      'Nama Penandatangan': item.signerName || '-',
      'Jabatan Penandatangan': item.signerTitle || '-',
      'QR Code': item.qrcode || '-',
      'Daftar Pekerja': formatWorkerNames(item.namaPerkerjaText) || '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Add submissions sheet
    const submissionsWs = XLSX.utils.json_to_sheet(submissionsData);
    
    // Set column widths for submissions
    const submissionsColWidths = [
      { wch: 5 },   // No
      { wch: 15 },  // Nomor SIMLOK
      { wch: 15 },  // Tanggal SIMLOK
      { wch: 20 },  // ID Submission
      { wch: 25 },  // Nomor Surat/Berdasarkan
      { wch: 40 },  // Perihal/Pekerjaan
      { wch: 25 },  // Tujuan/Lokasi Kerja
      { wch: 25 },  // Tempat Pelaksanaan
      { wch: 30 },  // Pelaksanaan
      { wch: 15 },  // Jam Kerja
      { wch: 30 },  // Sarana Kerja
      { wch: 30 },  // Lain-lain
      { wch: 15 },  // Status Approval
      { wch: 25 },  // Nama Vendor/Petugas
      { wch: 25 },  // Perusahaan Vendor
      { wch: 25 },  // Email Vendor
      { wch: 15 },  // Telepon Vendor
      { wch: 15 },  // Tanggal Submit
      { wch: 20 },  // Approved By
      { wch: 12 },  // Total Pekerja
      { wch: 15 },  // Nomor SIMJA
      { wch: 15 },  // Tanggal SIMJA
      { wch: 15 },  // Nomor SIKA
      { wch: 15 },  // Tanggal SIKA
      { wch: 20 },  // Dokumen SIKA
      { wch: 20 },  // Dokumen SIMJA
      { wch: 30 },  // Catatan
      { wch: 25 },  // Nama Penandatangan
      { wch: 25 },  // Jabatan Penandatangan
      { wch: 15 },  // QR Code
      { wch: 50 }   // Daftar Pekerja
    ];
    submissionsWs['!cols'] = submissionsColWidths;
    
    XLSX.utils.book_append_sheet(wb, submissionsWs, sheetName);

    // Add workers detail sheet if there's worker data
    const allWorkers: any[] = [];
    filteredData.forEach((submission, _submissionIndex) => {
      submission.daftarPekerja.forEach((worker, _workerIndex) => {
        allWorkers.push({
          'No': allWorkers.length + 1,
          'ID Submission': submission.id,
          'Nomor Surat': submission.nomorSurat,
          'Vendor': submission.vendorName,
          'Nama Lengkap': worker.namaLengkap,
          'Foto Pekerja': worker.foto || '-',
          // Note: Most detailed worker fields are not available in current schema
        //   'NIK': worker.nik || '-',
        //   'Tempat Lahir': worker.tempatLahir || '-',
        //   'Tanggal Lahir': worker.tanggalLahir || '-',
        //   'Jenis Kelamin': worker.jenisKelamin || '-',
        //   'Agama': worker.agama || '-',
        //   'Status Perkawinan': worker.statusPerkawinan || '-',
        //   'Alamat': worker.alamat || '-',
        //   'No Telepon': worker.noTelepon || '-',
        //   'Email': worker.email || '-',
        //   'Pendidikan Terakhir': worker.pendidikanTerakhir || '-',
        //   'Jabatan': worker.jabatan || '-',
        //   'Pengalaman': worker.pengalaman || '-',
        //   'Keahlian Khusus': worker.keahlianKhusus || '-',
        //   'Sertifikasi': worker.sertifikasi || '-',
        //   'Catatan': worker.catatan || '-'
        });
      });
    });

    if (allWorkers.length > 0) {
      const workersWs = XLSX.utils.json_to_sheet(allWorkers);
      
      // Set column widths for workers
      const workersColWidths = [
        { wch: 5 },   // No
        { wch: 20 },  // ID Submission
        { wch: 20 },  // Nomor Surat
        { wch: 25 },  // Vendor
        { wch: 25 },  // Nama Lengkap
        { wch: 20 },  // Foto Pekerja
        { wch: 20 },  // NIK
        { wch: 15 },  // Tempat Lahir
        { wch: 12 },  // Tanggal Lahir
        { wch: 12 },  // Jenis Kelamin
        { wch: 10 },  // Agama
        { wch: 15 },  // Status Perkawinan
        { wch: 40 },  // Alamat
        { wch: 15 },  // No Telepon
        { wch: 25 },  // Email
        { wch: 20 },  // Pendidikan Terakhir
        { wch: 20 },  // Jabatan
        { wch: 30 },  // Pengalaman
        { wch: 30 },  // Keahlian Khusus
        { wch: 30 },  // Sertifikasi
        { wch: 30 }   // Catatan
      ];
      workersWs['!cols'] = workersColWidths;
      
      XLSX.utils.book_append_sheet(wb, workersWs, 'Workers Detail');
    }

    // Add summary sheet
    const summaryData = [
      ['LAPORAN EXPORT SUBMISSIONS'],
      [''],
      ['Filter Tanggal:', dateFrom && dateTo ? `${formatDate(dateFrom)} - ${formatDate(dateTo)}` : 
        dateFrom ? `Dari: ${formatDate(dateFrom)}` : 
        dateTo ? `Sampai: ${formatDate(dateTo)}` : 'Semua Data'],
      ['Total Submissions:', filteredData.length],
      ['Total Pekerja:', allWorkers.length],
      ['Export Time:', new Date().toLocaleString('id-ID')],
      [''],
      ['Status Summary:'],
      ['APPROVED:', filteredData.filter(item => item.statusApproval === 'APPROVED').length],
      ['PENDING:', filteredData.filter(item => item.statusApproval === 'PENDING').length],
      ['REJECTED:', filteredData.filter(item => item.statusApproval === 'REJECTED').length]
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Write file
    XLSX.writeFile(wb, filename);

    return {
      success: true,
      message: `Data berhasil diexport ke ${filename}`,
      totalData: filteredData.length
    };

  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return {
      success: false,
      message: 'Gagal mengexport data ke Excel',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// Helper function to format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Helper function to format worker names with bullet points
const formatWorkerNames = (namaPerkerjaText: string): string => {
  if (!namaPerkerjaText) return '';
  
  const names = namaPerkerjaText
    .split(/[\n,]+/)
    .map(name => name.trim())
    .filter(name => name.length > 0);
  
  if (names.length === 0) return '';
  
  return names.map(name => `- ${name}`).join('\n');
};