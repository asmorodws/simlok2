// simlok-pdf.ts
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type RGB,
  type PDFImage,
} from "pdf-lib";
import * as QRCode from 'qrcode';

/**
 * Load logo image for PDF generation
 * Works both on client-side (fetch) and server-side (fs)
 */
async function loadLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoPath = '/assets/logo_pertamina.png';
    
    if (typeof window !== 'undefined') {
      // Client-side: use fetch
      const response = await fetch(logoPath);
      if (response.ok) {
        const logoBytes = await response.arrayBuffer();
        return await pdfDoc.embedPng(new Uint8Array(logoBytes));
      }
    } else {
      // Server-side: use file system
      const fs = await import('fs');
      const path = await import('path');
      const logoFilePath = path.join(process.cwd(), 'public', logoPath);
      
      if (fs.existsSync(logoFilePath)) {
        const fileBuffer = fs.readFileSync(logoFilePath);
        return await pdfDoc.embedPng(fileBuffer);
      }
    }
  } catch (error) {
    console.warn('Failed to load logo:', error);
  }
  
  return null;
}

/**
 * Generate QR code image for PDF
 */
async function generateQRImage(pdfDoc: PDFDocument, qrString: string): Promise<PDFImage | null> {
  try {
    // Generate QR code as PNG buffer
    const qrBuffer = await QRCode.toBuffer(qrString, {
      type: 'png',
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // Embed QR code image into PDF
    return await pdfDoc.embedPng(qrBuffer);
  } catch (error) {
    console.warn('Failed to generate QR code image:', error);
    return null;
  }
}

/** Struktur data mengikuti placeholder di template kamu */
export interface SubmissionPDFData {
  simlok_number?: string | null;
  simlok_date?: string | Date | null | undefined;
  implementation_start_date?: string | Date | null | undefined;
  implementation_end_date?: string | Date | null | undefined;
  vendor_name: string;
  simja_number?: string | null;
  simja_date?: string | Date | null | undefined;
  sika_number?: string | null;
  sika_date?: string | Date | null | undefined;
  job_description: string;
  work_location: string;
  implementation: string | null;
  working_hours: string;            // contoh: "08:30 - 06:30 WIB"
  other_notes?: string | null;
  work_facilities: string;
  worker_names?: string | null;
  content?: string | null;
  signer_position?: string | null;
  signer_name?: string | null;
  qrcode?: string | null;  // QR code string for PDF
  // Tambahkan untuk daftar pekerja dari tabel terpisah
  workerList?: Array<{
    worker_name: string;
    worker_photo?: string | null;
  }>;
  // Support database field name
  worker_list?: Array<{
    worker_name: string;
    worker_photo?: string | null;
  }>;
}

export type SIMLOKOptions = {
  logoBase64?: string;     // opsional
  primary?: RGB;           // warna judul
  cityIssued?: string;     // default "Jakarta"
  headTitle?: string;      // default "Head of Security Region I"
  headName?: string;       // default "Juliarto Santoso"
  fontSize?: number;       // default 12
  leftLabelWidth?: number; // default 190
  lineGap?: number;        // default 15.5
};

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 50;
const LEFT_LABEL_WIDTH_DEFAULT = 160;
const LINE_GAP_DEFAULT = 15.5;

function toDate(d?: string | Date | null) {
  if (!d) return null;
  return typeof d === "string" ? new Date(d) : d;
}

function fmtDateID(d?: string | Date | null) {
  const dd = toDate(d);
  if (!dd || isNaN(+dd)) return "-";
  return dd.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Ekstrak tanggal dari text pelaksanaan
 * Contoh: "Terhitung mulai tanggal 01 Agustus 2025 sampai 15 Agustus 2025"
 * Akan mengambil tanggal pertama: "01 Agustus 2025"
 */
function extractDateFromPelaksanaan(pelaksanaan?: string | null): Date | null {
  if (!pelaksanaan) return null;
  
  // Pattern untuk menangkap tanggal dalam format: DD Bulan YYYY
  const datePattern = /(\d{1,2})\s+(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(\d{4})/i;
  const match = pelaksanaan.match(datePattern);
  
  if (!match) return null;
  
  const [, day, month, year] = match;
  
  // Mapping bulan Indonesia ke nomor bulan
  const monthMap: { [key: string]: number } = {
    'januari': 0, 'februari': 1, 'maret': 2, 'april': 3,
    'mei': 4, 'juni': 5, 'juli': 6, 'agustus': 7,
    'september': 8, 'oktober': 9, 'november': 10, 'desember': 11
  };
  
  const monthIndex = month ? monthMap[month.toLowerCase()] : undefined;
  if (monthIndex === undefined || !year || !day) return null;
  
  return new Date(parseInt(year), monthIndex, parseInt(day));
}

/** Hapus newline ganda & spasi berlebih agar wrap presisi */
function normalizeInline(s?: string | null) {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

class PDFKit {
  doc!: PDFDocument;
  page: any;
  font!: PDFFont;
  bold!: PDFFont;

  x = MARGIN;
  y = A4.h - MARGIN;

  fs = 12;
  lineGap = LINE_GAP_DEFAULT;
  leftLabelWidth = LEFT_LABEL_WIDTH_DEFAULT;

  async init() {
    this.doc = await PDFDocument.create();
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
  }

  addPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.x = MARGIN;
    this.y = A4.h - MARGIN;
  }

  measure(text: string, opts?: { size?: number; bold?: boolean }) {
    const size = opts?.size ?? this.fs;
    const f = opts?.bold ? this.bold : this.font;
    return f.widthOfTextAtSize(text, size);
  }

  text(
    t: string,
    x: number,
    y: number,
    o?: { size?: number; bold?: boolean; color?: RGB }
  ) {
    this.page.drawText(t, {
      x,
      y,
      size: o?.size ?? this.fs,
      font: o?.bold ? this.bold : this.font,
      color: o?.color ?? rgb(0, 0, 0),
    });
  }

  center(t: string, y: number, o?: { size?: number; bold?: boolean; color?: RGB }) {
    const w = this.measure(t, o);
    const cx = (A4.w - w) / 2;
    this.text(t, cx, y, o);
  }

  wrap(
    t: string,
    x: number,
    maxW: number,
    o?: { size?: number; bold?: boolean }
  ) {
    const size = o?.size ?? this.fs;
    const f = o?.bold ? this.bold : this.font;
    const words = t.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = f.widthOfTextAtSize(test, size);
      if (width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const ln of lines) {
      this.pageBreak();
      this.text(ln, x, this.y, { size, bold: o?.bold ?? false });
      this.y -= this.lineGap;
    }
  }

  pageBreak(min = 60) {
    if (this.y < MARGIN + min) this.addPage();
  }

  /**
   * Baris bernomor dengan label di kiri, titik dua di kolom tengah,
   * dan value yang dibungkus di kolom kanan.
   */
  numberedRow(
    no: number,
    label: string,
    rawValue?: string | null,
    opts?: { valueBold?: boolean }
  ) {
    const value = (rawValue ?? "").toString();
    this.pageBreak();

    // Label kiri (bold)
    const left = `${no}. ${label}`;
    this.text(left, this.x, this.y, { bold: false });

    // Titik dua di kolom tengah agar align konsisten
    const colonX = this.x + this.leftLabelWidth - this.measure(":", { size: this.fs }) - 2;
    this.text(":", colonX, this.y);

    // Value di kolom kanan (wrap)
    const rightX = this.x + this.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    this.wrap(normalizeInline(value) || "-", rightX, rightW, {
      bold: !!opts?.valueBold,
    });
  }
}

export async function generateSIMLOKPDF(submissionData: SubmissionPDFData): Promise<Uint8Array> {
  const k = new PDFKit();
  await k.init();
  
  const { page } = k;
  const { width, height } = page.getSize();

  // Load and embed the Pertamina logo
  const logoImage = await loadLogo(k.doc);

  const s = submissionData;

  // Set PDF metadata with SIMLOK information
  const simlokNumber = s.simlok_number ? `${s.simlok_number}` : "SIMLOK";
  const simlokTitle = `SIMLOK NO-${simlokNumber}`;
  const currentDate = new Date();
  
  k.doc.setTitle(simlokTitle);
  k.doc.setSubject("Surat Izin Masuk Lokasi PT PERTAMINA (PERSERO)");
  k.doc.setAuthor("PT PERTAMINA (PERSERO)");
  k.doc.setKeywords(["SIMLOK", "Pertamina", "Izin Masuk", simlokNumber, s.vendor_name]);
  k.doc.setProducer("SIMLOK System");
  k.doc.setCreator("SIMLOK PDF Generator");
  k.doc.setCreationDate(currentDate);
  k.doc.setModificationDate(currentDate);

  // Set initial styling
  k.fs = 12;
  k.lineGap = LINE_GAP_DEFAULT;
  k.leftLabelWidth = LEFT_LABEL_WIDTH_DEFAULT;

  // Add logo to top-right if available
  if (logoImage) {
    const logoWidth = 120;
    const logoHeight = 40;
    const logoX = width - logoWidth - 40; // 40 pixels from right edge
    const logoY = height - 60; // 80 pixels from top (higher than title)
    
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
  }

  // Add centered header
  k.center("SURAT IZIN MASUK LOKASI", height - 100, {
    size: 16,
    bold: true,
    color: rgb(0, 0, 0),
  });

  // Add border bottom line under the title
  const titleY = height - 80;
  const lineY = titleY - 25; // 25 pixels below the title
  const lineStartX = 185; // Start line position
  const lineEndX = A4.w - 185; // End line position
  page.drawLine({
    start: { x: lineStartX, y: lineY },
    end: { x: lineEndX, y: lineY },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // SIMLOK number (centered)
  const simlokNo = s.simlok_number ? `${s.simlok_number}` : "";
  k.center(`SIMLOK NO-${simlokNo}`, height - 120, {
    size: 14,
  });

  // Introduction text
  k.text("Dengan ini di berikan izin memasuki lokasi PT PERTAMINA (PERSERO) kepada", 50, height - 160, {
    size: 12,
  });

  // Move to content area and add numbered items
  k.y = height - 190;

  k.numberedRow(1, "Nama", s.vendor_name, { valueBold: false });

  // Format berdasarkan (SIMJA info)
  const berdasarkan = s.simja_number
    ? `${normalizeInline(s.simja_number)} Tgl. ${fmtDateID(s.simja_date)}`
    : "";
  
  k.numberedRow(2, "Berdasarkan", berdasarkan);
  k.numberedRow(3, "Pekerjaan", s.job_description);
  k.numberedRow(4, "Lokasi Kerja", s.work_location);
  k.numberedRow(5, "Pelaksanaan", normalizeInline(s.implementation || ""));
  k.numberedRow(6, "Jam Kerja", `Mulai pukul ${s.working_hours}`);
  
  // Special handling for "Lain-lain" to show as bulleted list
  if (s.other_notes && s.other_notes.trim().length > 0) {
    k.pageBreak();
    
    // Label kiri (bold)
    const left = "7. Lain-lain";
    k.text(left, k.x, k.y, { bold: false });

    // Titik dua di kolom tengah
    const colonX = k.x + k.leftLabelWidth - k.measure(":", { size: k.fs }) - 2;
    k.text(":", colonX, k.y);

    // Process lain-lain as bulleted list
   const lines = s.other_notes.split('\n').map((l: string) => l.trim()).filter(Boolean);
const rightX = k.x + k.leftLabelWidth + 4;
const rightW = A4.w - MARGIN - rightX;

lines.forEach((line: string, idx: number) => {
  const isFirst = idx === 0;
  const isLast  = idx === lines.length - 2;

  if (isFirst) {
    k.wrap(` ${line}`, rightX, rightW);
  } else {
    // newline (spasi vertikal) sebelum baris terakhir
    if (isLast) k.y -= k.lineGap;

    k.pageBreak();
    k.wrap(` ${line}`, rightX, rightW);
  }
});

  } else {
    k.numberedRow(7, "Lain-lain", "");
  }
  
  k.numberedRow(8, "Sarana Kerja", s.work_facilities);

  // Add content paragraph if available
  k.y -= 10;
  if (s.content && s.content.trim().length > 0) {
    k.pageBreak();
    k.wrap(normalizeInline(s.content), 50, A4.w - 2 * MARGIN);
    k.y -= 10;
  }

  // Add bottom text
//   k.pageBreak();
//   k.wrap(`Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan
// tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan
// kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka
// kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan
// SIMLOK 2 hari sebelum masa berlaku habis.`, 50, A4.w - 2 * MARGIN);

  // Add signature section
  k.y -= 20;
  const signatureY = k.y;

  // Extract date from pelaksanaan or use tanggal_simlok as fallback
  const dateFromPelaksanaan = extractDateFromPelaksanaan(s.implementation);
  const displayDate = dateFromPelaksanaan || toDate(s.simlok_date);

  // Right side - Location and Date (above Head title)
  k.text("Dikeluarkan di : Jakarta", A4.w - 230, signatureY);
  k.text("Pada tanggal : " + fmtDateID(displayDate), A4.w - 230, signatureY - 20);

  // Right side - Head title and name (below location/date)
  const jabatanSigner = s.signer_position || "Head Or Security Region I";
  const namaSigner = s.signer_name || "Julianto Santoso";
  
  // Calculate precise positions for perfect centering
  const jabatanY = signatureY - 50;
  const namaY = signatureY - 180;
  
  // Draw jabatan
  k.text(jabatanSigner, A4.w - 230, jabatanY);
  
  // Add QR code if available - positioned with simple pixel values for easy maintenance
  if (s.qrcode) {
    const qrImage = await generateQRImage(k.doc, s.qrcode);
    if (qrImage) {
      const qrSize = 100;
      const qrX = 385; // Fixed X position from left edge
      const qrY = signatureY - 160; // Fixed Y position: between jabatan (-50) and nama (-180)
      
      // Draw QR code at fixed pixel position
      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });
    }
  }
  
  // Draw nama
  k.text(namaSigner, A4.w - 230, namaY, { bold: true });

  // Add second page with worker photos if available
  // Handle both workerList (interface) and worker_list (database)
  const workerData = s.workerList || (s as any).worker_list;
  console.log('=== WORKER DATA DEBUG ===');
  if (workerData && workerData.length > 0) {
    console.log(`Found ${workerData.length} workers`);
    workerData.forEach((worker: any, index: number) => {
      console.log(`Worker ${index + 1}: ${worker.worker_name}, Photo: ${worker.worker_photo ? 'YES' : 'NO'}`);
      if (worker.worker_photo) {
        console.log(`  Photo type: ${typeof worker.worker_photo}, Length: ${worker.worker_photo.length}`);
        console.log(`  Preview: ${worker.worker_photo.substring(0, 50)}...`);
      }
    });
    await addWorkerPhotosPage(k, workerData, s);
  } else {
    console.log('No worker data found');
  }

  return k.doc.save();
}

/**
 * Load and embed photo from file path or base64
 */
async function loadWorkerPhoto(pdfDoc: PDFDocument, photoPath?: string | null): Promise<PDFImage | null> {
  if (!photoPath) {
    console.log('No photo path provided');
    return null;
  }

  console.log('Loading worker photo...');
  console.log('Photo starts with "data:":', photoPath.startsWith('data:'));
  console.log('Photo preview:', photoPath.substring(0, 100) + '...');

  try {
    // Check if it's a base64 string (could be with or without data: prefix)
    if (photoPath.startsWith('data:image/') || photoPath.startsWith('data:') || photoPath.match(/^[A-Za-z0-9+/=]+$/)) {
      console.log('Processing base64 image');
      let base64Data: string | undefined;
      let imageFormat = 'jpeg'; // default
      
      if (photoPath.startsWith('data:image/')) {
        // Standard data URL format: data:image/jpeg;base64,/9j/4AAQ...
        const base64Parts = photoPath.split(',');
        if (base64Parts.length > 1) {
          base64Data = base64Parts[1];
          // Extract format from mime type
          if (photoPath.includes('image/png')) {
            imageFormat = 'png';
          } else if (photoPath.includes('image/jpeg') || photoPath.includes('image/jpg')) {
            imageFormat = 'jpeg';
          }
        } else {
          throw new Error('Invalid data URL format');
        }
      } else if (photoPath.startsWith('data:')) {
        // Generic data format
        const base64Parts = photoPath.split(',');
        base64Data = base64Parts.length > 1 ? base64Parts[1] : photoPath.replace('data:', '');
      } else {
        // Pure base64 string
        base64Data = photoPath;
      }
      
      console.log('Base64 data length:', base64Data?.length || 0);
      console.log('Image format detected:', imageFormat);
      
      if (base64Data) {
        let photoBytes: Buffer;
        
        if (typeof window !== 'undefined') {
          // Client-side: use Uint8Array for better browser compatibility
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          photoBytes = Buffer.from(bytes);
        } else {
          // Server-side: use Buffer directly
          photoBytes = Buffer.from(base64Data, 'base64');
        }
        
        if (imageFormat === 'png' || photoPath.includes('image/png')) {
          console.log('Embedding PNG image');
          return await pdfDoc.embedPng(photoBytes);
        } else {
          console.log('Embedding JPG image');
          return await pdfDoc.embedJpg(photoBytes);
        }
      }
    } else {
      // Handle file path - could be API path or direct file path
      console.log('Processing file path photo');
      let fullPath: string;
      
      if (photoPath.startsWith('/api/files/')) {
        // API endpoint path - convert to actual file path
        // /api/files/userId/folder/filename -> /uploads/userId/folder/filename
        fullPath = photoPath.replace('/api/files/', '/uploads/');
        console.log('Converted API path to file path:', fullPath);
      } else {
        // Regular file path
        fullPath = photoPath.startsWith('/') ? photoPath : `/uploads/${photoPath}`;
      }
      
      console.log('Full photo path:', fullPath);
      
      if (typeof window !== 'undefined') {
        // Client-side: use fetch - try both API endpoint and file path
        console.log('Client-side photo loading');
        
        // First try the API endpoint
        if (photoPath.startsWith('/api/files/')) {
          console.log('Trying API endpoint first');
          const apiResponse = await fetch(photoPath);
          console.log('API fetch response status:', apiResponse.status, apiResponse.ok);
          if (apiResponse.ok) {
            const photoBytes = await apiResponse.arrayBuffer();
            const uint8Array = new Uint8Array(photoBytes);
            
            if (fullPath.toLowerCase().includes('.png')) {
              return await pdfDoc.embedPng(uint8Array);
            } else {
              return await pdfDoc.embedJpg(uint8Array);
            }
          }
        }
        
        // Fallback to direct file path
        console.log('Trying direct file path');
        const response = await fetch(fullPath);
        console.log('File fetch response status:', response.status, response.ok);
        if (response.ok) {
          const photoBytes = await response.arrayBuffer();
          const uint8Array = new Uint8Array(photoBytes);
          
          // Try to determine format from file extension or content
          if (fullPath.toLowerCase().includes('.png')) {
            return await pdfDoc.embedPng(uint8Array);
          } else {
            return await pdfDoc.embedJpg(uint8Array);
          }
        }
      } else {
        // Server-side: use file system
        console.log('Server-side photo loading');
        const fs = await import('fs');
        const path = await import('path');
        
        // Simplified path resolution - no more fallbacks
        let photoFilePath: string;
        
        if (photoPath.startsWith('/api/files/')) {
          // Parse API path: /api/files/userId/category/filename
          const apiParts = photoPath.split('/');
          if (apiParts.length >= 5) {
            const userId = apiParts[3];
            const category = apiParts[4];
            const filename = apiParts.slice(5).join('/');
            
            // Validate required components
            if (!userId || !category || !filename) {
              throw new Error('Invalid API path components');
            }
            
            // Map category to actual folder name (from fileManager.ts)
            const categoryFolders: Record<string, string> = {
              sika: 'dokumen-sika',
              simja: 'dokumen-simja',
              id_card: 'id-card',
              other: 'lainnya',
              'worker-photo': 'foto-pekerja' // New category for worker photos
            };
            
            const folderName = categoryFolders[category] || category;
            
            photoFilePath = path.join(process.cwd(), 'public', 'uploads', userId, folderName, filename);
            console.log('Resolved photo file path:', photoFilePath);
          } else {
            throw new Error('Invalid API path format');
          }
        } else {
          // Regular file path
          photoFilePath = path.join(process.cwd(), 'public', fullPath);
        }
        
        if (fs.existsSync(photoFilePath)) {
          console.log('Photo file exists, reading...');
          const fileBuffer = fs.readFileSync(photoFilePath);
          
          if (photoFilePath.toLowerCase().includes('.png')) {
            console.log('Embedding PNG image from file');
            return await pdfDoc.embedPng(fileBuffer);
          } else {
            console.log('Embedding JPG image from file');
            return await pdfDoc.embedJpg(fileBuffer);
          }
        } else {
          console.log('Photo file not found:', photoFilePath);
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load worker photo:', photoPath, error);
  }
  
  return null;
}

/**
 * Add second page with worker photos
 */
async function addWorkerPhotosPage(
  k: PDFKit, 
  workerList: Array<{ worker_name: string; worker_photo?: string | null }>,
  submissionData: SubmissionPDFData
) {
  // Only proceed if there are workers
  if (!workerList || workerList.length === 0) {
    return;
  }

  // Add new page
  k.addPage();
  
  // Load and add logo to the second page as well
  const logoImage = await loadLogo(k.doc);
  if (logoImage) {
    const logoWidth = 120;
    const logoHeight = 40;
    const logoX = A4.w - logoWidth - 40; // 40 pixels from right edge
    const logoY = A4.h - 60; // 60 pixels from top
    
    k.page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
  }
  
  // // Add header
  // k.center("DAFTAR PEKERJA", A4.h - 100, {
  //   size: 16,
  //   bold: true,
  //   color: rgb(0, 0, 0),
  // });
  
  // Add line under header
  // const headerY = A4.h - 40;
  // const lineY = headerY - 65;
  // const lineStartX = 190;
  // const lineEndX = A4.w - 190;
  // k.page.drawLine({
  //   start: { x: lineStartX, y: lineY },
  //   end: { x: lineEndX, y: lineY },
  //   thickness: 1,
  //   color: rgb(0, 0, 0),
  // });
  
  // Add header dengan nomor SIMLOK
  const simlokNumber = submissionData.simlok_number || "-";
  k.text(`Lampiran Simlok No. ${simlokNumber}`, MARGIN, A4.h - 100, {
    size: 16,
    bold: true,
    color: rgb(0, 0, 0),
  });

  // Add nama vendor di bawah lampiran
  k.text("Nama petugas ", MARGIN, A4.h - 130, {
    size: 12,
    bold: false,
    color: rgb(0, 0, 0),
  });

  // Hitung lebar text "Nama petugas " untuk positioning nama vendor
  const namaPetugasWidth = k.measure("Nama petugas ", { size: 12, bold: false });
  k.text(submissionData.vendor_name, MARGIN + namaPetugasWidth, A4.h - 130, {
    size: 12,
    bold: true,
    color: rgb(0, 0, 0),
  });


  // Calculate grid layout
  const photosPerRow = 3;
  const photoWidth = 120;
  const photoHeight = 160;
  const marginHorizontal = (A4.w - (photosPerRow * photoWidth)) / (photosPerRow + 1);
  const marginVertical = 30;
  
  let currentRow = 0;
  let currentCol = 0;
  const startY = A4.h - 160; // Adjusted to make room for vendor name

  // Process each worker
  for (let i = 0; i < workerList.length; i++) {
    const worker = workerList[i];
    if (!worker) continue; // Skip if worker is undefined
    
    // Calculate position
    const x = marginHorizontal + (currentCol * (photoWidth + marginHorizontal));
    const y = startY - (currentRow * (photoHeight + marginVertical + 40)); // 40 extra for name

    // Check if we need a new page
    if (y - photoHeight < MARGIN + 60) {
      k.addPage();
      
      // Add logo to the new page
      const logoImage = await loadLogo(k.doc);
      if (logoImage) {
        const logoWidth = 120;
        const logoHeight = 40;
        const logoX = A4.w - logoWidth - 40; // 40 pixels from right edge
        const logoY = A4.h - 60; // 60 pixels from top
        
        k.page.drawImage(logoImage, {
          x: logoX,
          y: logoY,
          width: logoWidth,
          height: logoHeight,
        });
      }
      
      currentRow = 0;
      currentCol = 0;
      const newY = startY - (currentRow * (photoHeight + marginVertical + 40));
      // Recalculate x for new page
      const newX = marginHorizontal + (currentCol * (photoWidth + marginHorizontal));
      
      // Draw on new page
      await drawWorkerCard(k.page, k.doc, k.font, k.bold, worker, newX, newY, photoWidth, photoHeight);
    } else {
      // Draw on current page
      await drawWorkerCard(k.page, k.doc, k.font, k.bold, worker, x, y, photoWidth, photoHeight);
    }

    // Move to next position
    currentCol++;
    if (currentCol >= photosPerRow) {
      currentCol = 0;
      currentRow++;
    }
  }
}

/**
 * Draw individual worker card with photo and name
 */
async function drawWorkerCard(
  page: any,
  doc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  worker: { worker_name: string; worker_photo?: string | null },
  x: number,
  y: number,
  photoWidth: number,
  photoHeight: number
) {
  // Draw photo frame
  page.drawRectangle({
    x: x,
    y: y - photoHeight,
    width: photoWidth,
    height: photoHeight,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  // Load and draw photo if available
  if (worker.worker_photo) {
    console.log('Worker has photo:', worker.worker_name, worker.worker_photo);
    const photoImage = await loadWorkerPhoto(doc, worker.worker_photo);
    if (photoImage) {
      console.log('Photo loaded successfully for:', worker.worker_name);
      // Calculate dimensions to maintain aspect ratio
      const imgDims = photoImage.scale(1);
      const imgAspectRatio = imgDims.width / imgDims.height;
      const frameAspectRatio = photoWidth / photoHeight;
      
      let drawWidth = photoWidth - 10; // 5px padding on each side
      let drawHeight = photoHeight - 10;
      let drawX = x + 5;
      let drawY = y - photoHeight + 5;
      
      // Adjust dimensions to fit within frame while maintaining aspect ratio
      if (imgAspectRatio > frameAspectRatio) {
        // Image is wider, fit to width
        drawHeight = drawWidth / imgAspectRatio;
        drawY = y - (photoHeight + drawHeight) / 2;
      } else {
        // Image is taller, fit to height
        drawWidth = drawHeight * imgAspectRatio;
        drawX = x + (photoWidth - drawWidth) / 2;
      }
      
      page.drawImage(photoImage, {
        x: drawX,
        y: drawY,
        width: drawWidth,
        height: drawHeight,
      });
    } else {
      console.log('Photo not loaded for:', worker.worker_name);
      // Draw placeholder text if photo couldn't be loaded
      page.drawText("Foto tidak", { 
        x: x + 35, 
        y: y - photoHeight/2 + 10, 
        size: 10, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
      page.drawText("tersedia", { 
        x: x + 35, 
        y: y - photoHeight/2 - 5, 
        size: 10, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
    }
  } else {
    console.log('Worker has no photo:', worker.worker_name);
    // Draw placeholder for no photo
    page.drawText("Tidak ada", { 
      x: x + 35, 
      y: y - photoHeight/2 + 10, 
      size: 10, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
    page.drawText("foto", { 
      x: x + 45, 
      y: y - photoHeight/2 - 5, 
      size: 10, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
  }

  // Draw worker name below photo
  const nameY = y - photoHeight - 15;
  const textWidth = boldFont.widthOfTextAtSize(worker.worker_name, 10);
  const nameX = x + (photoWidth - textWidth) / 2; // Center the name
  
  page.drawText(worker.worker_name, { 
    x: nameX, 
    y: nameY, 
    size: 10, 
    font: boldFont,
    color: rgb(0, 0, 0)
  });
}
