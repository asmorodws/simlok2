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
import { numberToBahasa } from "@/lib/parseNumber";
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
import { SubmissionPDFData, SIMLOKOptions } from '@/types';

// Local SIMLOKOptions with additional fields not in common types
export type LocalSIMLOKOptions = {
  logoBase64?: string;     // opsional
  primary?: RGB;           // warna judul
  cityIssued?: string;     // default "Jakarta"
  headTitle?: string;      // default "Sr Officer Security III"
  headName?: string;       // default "Juliarto Santoso"
  fontSize?: number;       // default 12
  leftLabelWidth?: number; // default 190
  lineGap?: number;        // default 15.5
} & SIMLOKOptions;

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
  pageCount = 0;
  submissionData?: SubmissionPDFData;

  async init() {
    this.doc = await PDFDocument.create();
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.pageCount = 1;
  }

  async addPage() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pageCount++;
    this.x = MARGIN;
    
    // Add header to pages 2 and beyond
    if (this.pageCount > 1 && this.submissionData) {
      await this.addHeader();
      this.y = A4.h - 140; // Start content below header
    } else {
      this.y = A4.h - MARGIN;
    }
  }

  async addHeader() {
    if (!this.submissionData) return;
    
    // Add logo - await untuk memastikan logo ter-load
    const logoImage = await loadLogo(this.doc);
    if (logoImage) {
      const logoWidth = 120;
      const logoHeight = 40;
      const logoX = A4.w - logoWidth - 40;
      const logoY = A4.h - 60;
      
      this.page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight,
      });
    }
    
    // Add header dengan nomor SIMLOK
    const simlokNumber = this.submissionData.simlok_number || "[DRAFT]/XX/09/2025";
    this.text(`Lampiran Simlok No. ${simlokNumber}`, MARGIN, A4.h - 80, {
      size: 12,
      bold: true,
      color: rgb(0, 0, 0),
    });

    // Add nama vendor di bawah lampiran
    this.text("Nama petugas ", MARGIN, A4.h - 100, {
      size: 11,
      bold: false,
      color: rgb(0, 0, 0),
    });

    // Hitung lebar text "Nama petugas " untuk positioning nama vendor
    const namaPetugasWidth = this.measure("Nama petugas ", { size: 11, bold: false });
    this.text(this.submissionData.vendor_name, MARGIN + namaPetugasWidth, A4.h - 100, {
      size: 11,
      bold: true,
      color: rgb(0, 0, 0),
    });

    // // Add separator line
    // const lineY = A4.h - 120;
    // const lineStartX = MARGIN;
    // const lineEndX = A4.w - MARGIN;
    // this.page.drawLine({
    //   start: { x: lineStartX, y: lineY },
    //   end: { x: lineEndX, y: lineY },
    //   thickness: 0.5,
    //   color: rgb(0.7, 0.7, 0.7),
    // });
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

  async wrap(
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
      await this.pageBreak();
      this.text(ln, x, this.y, { size, bold: o?.bold ?? false });
      this.y -= this.lineGap;
    }
  }

  async pageBreak(min = 60) {
    if (this.y < MARGIN + min) await this.addPage();
  }

  /**
   * Baris bernomor dengan label di kiri, titik dua di kolom tengah,
   * dan value yang dibungkus di kolom kanan.
   */
  async numberedRow(
    no: number,
    label: string,
    rawValue?: string | null,
    opts?: { valueBold?: boolean }
  ) {
    const value = (rawValue ?? "").toString();
    await this.pageBreak();

    // Minimal spacing between rows for compactness
    if (no > 1) {
      this.y -= this.lineGap * 0.2; // Reduced from 0.5 to 0.2
    }

    // Label kiri (bold)
    const left = `${no}. ${label}`;
    this.text(left, this.x, this.y, { bold: false });

    // Titik dua di kolom tengah agar align konsisten
    const colonX = this.x + this.leftLabelWidth - this.measure(":", { size: this.fs }) - 2;
    this.text(":", colonX, this.y);

    // Value di kolom kanan (wrap)
    const rightX = this.x + this.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    await this.wrap(normalizeInline(value) || "-", rightX, rightW, {
      bold: !!opts?.valueBold,
    });
    
    // Spacing after each numbered row for better readability
    this.y -= this.lineGap * 0.4; // Increased spacing between points
  }
}

export async function generateSIMLOKPDF(submissionData: SubmissionPDFData): Promise<Uint8Array> {
  const k = new PDFKit();
  await k.init();
  
  // Store submission data for header generation
  k.submissionData = submissionData;
  
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

  // Set initial styling - optimized for single page
  k.fs = 11; // Increased from 10 to 11
  k.lineGap = 13; // Increased from 12 to 13
  k.leftLabelWidth = 140; // Keep as 140 for compactness

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
  k.center("SURAT IZIN MASUK LOKASI", height - 85, {
    size: 14, // Reduced from 16 to 14
    bold: true,
    color: rgb(0, 0, 0),
  });

  // Add border bottom line under the title
  const titleY = height - 70;
  const lineY = titleY - 20; // Reduced spacing
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
  k.center(`SIMLOK NO-${simlokNo}`, height - 105, {
    size: 12, // Reduced from 14 to 12
  });

  // Introduction text
  k.text("Dengan ini di berikan izin memasuki lokasi PT PERTAMINA (PERSERO) kepada", 50, height - 135, {
    size: 11, // Match with content font size
  });

  // Move to content area and add numbered items with proper spacing
  k.y = height - 160; // Added more spacing between intro text and point 1

  await k.numberedRow(1, "Nama", s.vendor_name, { valueBold: false });

  // Format berdasarkan (Dokumen Pendukung 1)
  const berdasarkan = s.supporting_doc1_number
    ? `${normalizeInline(s.supporting_doc1_number)} Tgl. ${fmtDateID(s.supporting_doc1_date)}`
    : "";
  
  await k.numberedRow(2, "Berdasarkan", berdasarkan);
  await k.numberedRow(3, "Pekerjaan", s.job_description);
  await k.numberedRow(4, "Lokasi Kerja", s.work_location);
  
  // Use provided pelaksanaan or generate template based on dates
  let pelaksanaanText = s.implementation;
  if (!pelaksanaanText || pelaksanaanText.trim().length === 0) {
    if (s.implementation_start_date && s.implementation_end_date) {
      pelaksanaanText = `Terhitung mulai tanggal ${fmtDateID(s.implementation_start_date)} sampai ${fmtDateID(s.implementation_end_date)}. Termasuk hari Sabtu, Minggu dan hari libur lainnya.`;
    } else {
      pelaksanaanText = "Terhitung mulai tanggal [Tanggal Mulai] sampai [Tanggal Selesai]. Termasuk hari Sabtu, Minggu dan hari libur lainnya.";
    }
  }
  
  await k.numberedRow(5, "Pelaksanaan", normalizeInline(pelaksanaanText));
  await k.numberedRow(6, "Jam Kerja", `Mulai pukul ${s.working_hours}`);
  
  // Special handling for "Lain-lain" to show as bulleted list or template preview
  if (s.other_notes && s.other_notes.trim().length > 0) {
    await k.pageBreak();
    
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

for (let idx = 0; idx < lines.length; idx++) {
  const line = lines[idx];
  const isFirst = idx === 0;
  const isLast  = idx === lines.length - 2;

  if (isFirst) {
    await k.wrap(` ${line}`, rightX, rightW);
  } else {
    // newline (spasi vertikal) sebelum baris terakhir
    if (isLast) k.y -= k.lineGap;

    await k.pageBreak();
    await k.wrap(` ${line}`, rightX, rightW);
  }
}

    // Add spacing after custom other_notes to match other numbered rows
    k.y -= k.lineGap * 0.4;

  } else {
    // Generate template preview when no actual data
    await k.pageBreak();
    
    // Label kiri (bold)
    const left = "7. Lain-lain";
    k.text(left, k.x, k.y, { bold: false });

    // Titik dua di kolom tengah
    const colonX = k.x + k.leftLabelWidth - k.measure(":", { size: k.fs }) - 2;
    k.text(":", colonX, k.y);

    // Generate template preview similar to reviewer
    const rightX = k.x + k.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    
    // Generate structured template with bold formatting
    
    // Line 1: Introduction
    await k.wrap(" Izin diberikan berdasarkan :", rightX, rightW, { bold: false });
    
    // Minimal spacing before SIMJA section
    k.y -= k.lineGap * 0.2; // Reduced spacing
    
    // Dokumen Pendukung 1 section
    if ((s.supporting_doc1_type && s.supporting_doc1_number && s.supporting_doc1_date) || s.supporting_doc1_type || s.supporting_doc1_number || s.supporting_doc1_date) {
      await k.pageBreak();
      
      // Bullet point dengan jenis dokumen bold dan sisa text normal
      const bulletX = rightX;
      k.text(" • ", bulletX, k.y, { bold: false });
      const docTypeX = bulletX + k.measure(" • ", { bold: false });
      const docType = s.supporting_doc1_type || "Dokumen Perizinan";
      k.text(docType, docTypeX, k.y, { bold: true });
      
      // Move to next line
      k.y -= k.lineGap;
      
      // Baris kedua dengan indentasi untuk No. dan Tanggal
      await k.pageBreak();
      const docNum = s.supporting_doc1_number || '[Nomor Dokumen]';
      const docDate = s.supporting_doc1_date ? fmtDateID(s.supporting_doc1_date) : '[Tanggal Dokumen]';
      await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
      
      // Minimal spacing after dokumen pendukung 1 section
      k.y -= k.lineGap * 0.2;
    }
    
    // Dokumen Pendukung 2 section
    if ((s.supporting_doc2_type && s.supporting_doc2_number && s.supporting_doc2_date) || s.supporting_doc2_type || s.supporting_doc2_number || s.supporting_doc2_date) {
      await k.pageBreak();
      
      // Bullet point dengan jenis dokumen bold dan sisa text normal
      const bulletX = rightX;
      k.text(" • ", bulletX, k.y, { bold: false });
      const docTypeX = bulletX + k.measure(" • ", { bold: false });
      const docType2 = s.supporting_doc2_type || "Dokumen Perizinan Tambahan";
      k.text(docType2, docTypeX, k.y, { bold: true });
      
      // Move to next line
      k.y -= k.lineGap;
      
      // Baris kedua dengan indentasi untuk No. dan Tanggal
      await k.pageBreak();
      const docNum2 = s.supporting_doc2_number || '[Nomor Dokumen]';
      const docDate2 = s.supporting_doc2_date ? fmtDateID(s.supporting_doc2_date) : '[Tanggal Dokumen]';
      await k.wrap(`   No. ${docNum2} Tanggal ${docDate2}`, rightX, rightW, { bold: true });
      
      // Minimal spacing after dokumen pendukung 2 section
      k.y -= k.lineGap * 0.2;
    }
    
    // Head of Security section with bold date
    await k.pageBreak();
    await k.wrap(" ", rightX, rightW, { bold: false });
    
    await k.pageBreak();
    await k.wrap("  Diterima Sr Officer III Security:", rightX, rightW, { bold: false });
    
    await k.pageBreak();
    const simlokDate = s.simlok_date ? fmtDateID(s.simlok_date) : fmtDateID(new Date());
    await k.wrap(`  Tanggal ${simlokDate}`, rightX, rightW, { bold: true });
  }
  
  // Add spacing after point 7 (Lain-lain) to match other numbered rows
  k.y -= k.lineGap * 0.4; // Same spacing as numberedRow function
  
  // Get actual worker count from worker data if worker_count is null/0
  const currentWorkerData = s.workerList || (s as any).worker_list;
  const actualWorkerCount = s.worker_count || (currentWorkerData ? currentWorkerData.length : 0);
  
  await k.numberedRow(8, "Sarana Kerja", `${s.work_facilities}. Jumlah Pekerja ${actualWorkerCount} (${numberToBahasa(actualWorkerCount)}) Orang`);

  // Add content paragraph - use provided content or default template
  k.y -= 3; // Further reduced spacing
  const contentText = s.content && s.content.trim().length > 0 
    ? s.content 
    : "Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan SIMLOK 2 hari sebelum masa berlaku habis.";
  
  await k.pageBreak();
  await k.wrap(normalizeInline(contentText), 50, A4.w - 2 * MARGIN, { size: 11 }); // Match with main content font size
  k.y -= 3; // Further reduced spacing

  // Add bottom text
//   k.pageBreak();
//   k.wrap(`Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan
// tentang keamanan dan keselamatan kerja dan ketertiban, apabila pihak ke-III melakukan
// kesalahan atau kelalaian yang mengakibatkan kerugian PT. Pertamina (Persero), maka
// kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan
// SIMLOK 2 hari sebelum masa berlaku habis.`, 50, A4.w - 2 * MARGIN);

  // Add signature section
  k.y -= 8; // Further reduced spacing
  const signatureY = k.y;

  // Extract date from pelaksanaan or use tanggal_simlok as fallback
  const dateFromPelaksanaan = extractDateFromPelaksanaan(s.implementation);
  const displayDate = dateFromPelaksanaan || toDate(s.simlok_date);

  // Right side - Location and Date (above Head title)
  k.text("Dikeluarkan di : Jakarta", A4.w - 230, signatureY, { size: 11 });
  k.text("Pada tanggal : " + fmtDateID(displayDate), A4.w - 230, signatureY - 15, { size: 11 });

  // Right side - Head title and name (below location/date)
  const jabatanSigner = s.signer_position || "Head Or Security Region I";
  const namaSigner = s.signer_name || "Julianto Santoso";
  
  // Calculate precise positions for perfect centering - more compact
  const jabatanY = signatureY - 40; // Reduced spacing
  const namaY = signatureY - 145; // Reduced spacing
  
  // Draw jabatan
  k.text(jabatanSigner, A4.w - 230, jabatanY, { size: 11 });
  
  // Add QR code if available - positioned with simple pixel values for easy maintenance
  if (s.qrcode && s.approval_status === 'APPROVED') {
    const qrImage = await generateQRImage(k.doc, s.qrcode);
    if (qrImage) {
      const qrSize = 80; // Reduced QR code size
      const qrX = 395; // Adjusted position
      const qrY = signatureY - 130; // Adjusted position for more compact layout
      
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
  k.text(namaSigner, A4.w - 230, namaY, { bold: true, size: 11 });

  // Add second page with worker photos if available
  // Handle both workerList (interface) and worker_list (database)
  const workerData = s.workerList || (s as any).worker_list;
  if (workerData && workerData.length > 0) {
    await addWorkerPhotosPage(k, workerData);
  }

  return k.doc.save();
}

import { loadWorkerPhoto, preloadWorkerPhotos } from './imageLoader';

/**
 * Add second page with worker photos
 */
async function addWorkerPhotosPage(
  k: PDFKit, 
  workerList: Array<{ worker_name: string; worker_photo?: string | null }>
) {
  // Only proceed if there are workers
  if (!workerList || workerList.length === 0) {
    return;
  }

  // Preload all worker photos in batch for better performance
  await preloadWorkerPhotos(k.doc, workerList);

  // Add new page - header akan otomatis ditambahkan
  await k.addPage();

  // Calculate grid layout optimized for 3x3 photos
  const photosPerRow = 3;
  const photoWidth = 130;  // Optimized for better fit
  const photoHeight = 170; // Optimized for better fit
  const marginHorizontal = (A4.w - (photosPerRow * photoWidth)) / (photosPerRow + 1);
  const marginVertical = 12; // Reduced vertical margin
  const nameSpacing = 20; // Space for worker name below photo
  
  let currentRow = 0;
  let currentCol = 0;
  const startY = A4.h - 140; // Optimized start position to fit header

  // Process each worker
  for (let i = 0; i < workerList.length; i++) {
    const worker = workerList[i];
    if (!worker) continue; // Skip if worker is undefined
    
    // Calculate position
    const x = marginHorizontal + (currentCol * (photoWidth + marginHorizontal));
    const y = startY - (currentRow * (photoHeight + marginVertical + nameSpacing)); // Use nameSpacing constant

    // Check if we need a new page (optimized for 3x3 grid)
    const bottomY = y - photoHeight;
    const pageLimit = MARGIN + 30;
    
    // Check if we need a new page - either by space limit or by 3x3 grid limit (max 9 per page)
    const workersOnCurrentPage = (currentRow * photosPerRow) + currentCol;
    const needNewPageBySpace = bottomY < pageLimit;
    const needNewPageByGrid = workersOnCurrentPage >= 9; // 3x3 = 9 workers max per page
    
    if (needNewPageBySpace || needNewPageByGrid) {
      await k.addPage(); // Header akan otomatis ditambahkan oleh addPage()
      
      currentRow = 0;
      currentCol = 0;
      const newY = startY - (currentRow * (photoHeight + marginVertical + nameSpacing));
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
    console.log(`DrawWorkerCard: Processing worker ${worker.worker_name} with photo: ${worker.worker_photo}`);
    const photoImage = await loadWorkerPhoto(doc, worker.worker_photo);
    
    if (photoImage) {
      try {
        console.log(`DrawWorkerCard: Successfully loaded photo for ${worker.worker_name}, drawing image...`);
        
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
        
        console.log(`DrawWorkerCard: Drawing image for ${worker.worker_name} at position (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
        
        page.drawImage(photoImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        
        console.log(`DrawWorkerCard: Successfully drawn photo for ${worker.worker_name}`);
      } catch (error) {
        console.error(`DrawWorkerCard: Error drawing photo for ${worker.worker_name}:`, error);
        
        // Draw error placeholder
        page.drawText("Error", { 
          x: x + photoWidth/2 - 15, 
          y: y - photoHeight/2 + 10, 
          size: 10, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
        page.drawText("loading", { 
          x: x + photoWidth/2 - 18, 
          y: y - photoHeight/2 - 5, 
          size: 10, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
      }
    } else {
      console.warn(`DrawWorkerCard: Photo image is null/undefined for worker ${worker.worker_name}`);
      
      // Draw placeholder text if photo couldn't be loaded
      page.drawText("Foto tidak", { 
        x: x + photoWidth/2 - 25, 
        y: y - photoHeight/2 + 10, 
        size: 10, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
      page.drawText("tersedia", { 
        x: x + photoWidth/2 - 20, 
        y: y - photoHeight/2 - 5, 
        size: 10, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
    }
  } else {
    // Draw placeholder for no photo
    page.drawText("Tidak ada", { 
      x: x + photoWidth/2 - 25, 
      y: y - photoHeight/2 + 10, 
      size: 10, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
    page.drawText("foto", { 
      x: x + photoWidth/2 - 10, 
      y: y - photoHeight/2 - 5, 
      size: 10, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
  }

  // Draw worker name below photo with reduced spacing
  const nameY = y - photoHeight - 15; // Reduced from 15 to 8
  const maxNameWidth = photoWidth - 4; // Leave 2px margin on each side
  let displayName = worker.worker_name;
  let textWidth = boldFont.widthOfTextAtSize(displayName, 9);
  
  // Truncate name if too long to fit in photo width
  if (textWidth > maxNameWidth) {
    while (textWidth > maxNameWidth && displayName.length > 0) {
      displayName = displayName.substring(0, displayName.length - 4) + '...';
      textWidth = boldFont.widthOfTextAtSize(displayName, 9);
    }
  }
  
  const nameX = x + (photoWidth - textWidth) / 2; // Center the name
  
  page.drawText(displayName, { 
    x: nameX, 
    y: nameY, 
    size: 9, // Reduced font size from 10 to 9
    // font: boldFont,
    color: rgb(0, 0, 0)
  });
}
