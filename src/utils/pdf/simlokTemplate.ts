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

  async addPage(pageType?: 'documents' | 'workers') {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pageCount++;
    this.x = MARGIN;
    
    // Add header to pages 2 and beyond
    if (this.pageCount > 1 && this.submissionData) {
      await this.addHeader(pageType);
      this.y = A4.h - 140; // Start content below header
    } else {
      this.y = A4.h - MARGIN;
    }
  }

  async addHeader(pageType?: 'documents' | 'workers') {
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
    const simlokNumber = this.submissionData.simlok_number || "[DRAFT]/S00330/2025";
    this.text(`Lampiran Simlok No. ${simlokNumber}`, MARGIN, A4.h - 80, {
      size: 12,
      bold: true,
      color: rgb(0, 0, 0),
    });

    // Add text di bawah lampiran - berbeda untuk halaman dokumen vs halaman pekerja
    let labelText = "Nama Pekerja ";
    if (pageType === 'documents') {
      labelText = "Dokumen SIMJA/SIKA/HSSE ";
    }
    
    this.text(labelText, MARGIN, A4.h - 100, {
      size: 11,
      bold: false,
      color: rgb(0, 0, 0),
    });

    // Hitung lebar text label untuk positioning nama vendor
    const labelWidth = this.measure(labelText, { size: 11, bold: false });
    this.text(this.submissionData.vendor_name, MARGIN + labelWidth, A4.h - 100, {
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

  // Format berdasarkan dari field based_on atau default text
  const berdasarkan = "Surat Permohonan Izin Kerja";
  
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

    // Generate template preview
    const rightX = k.x + k.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    
    // Line 1: Introduction
    await k.wrap(" Izin diberikan berdasarkan :", rightX, rightW, { bold: false });
    
    // Minimal spacing
    k.y -= k.lineGap * 0.2;
    
    // SIMJA section
    await k.pageBreak();
    const bulletX = rightX;
    k.text(" • ", bulletX, k.y, { bold: false });
    const simjaX = bulletX + k.measure(" • ", { bold: false });
    k.text("SIMJA", simjaX, k.y, { bold: true });
    
    // Add SIMJA type if available (not bold, same line)
    if (s.simja_type) {
      const simjaTextWidth = k.measure("SIMJA", { bold: true });
      const simjaTypeX = simjaX + simjaTextWidth + k.measure(" ", { bold: false });
      k.text(` ${s.simja_type}`, simjaTypeX, k.y, { bold: false });
    }
    k.y -= k.lineGap;
    
    await k.pageBreak();
    const simjaNum = s.simja_number || '[Nomor SIMJA]';
    const simjaDate = s.simja_date ? fmtDateID(s.simja_date) : '[Tanggal SIMJA]';
    await k.wrap(`   No. ${simjaNum} Tanggal ${simjaDate}`, rightX, rightW, { bold: true });
    k.y -= k.lineGap * 0.2;
    
    // SIKA section
    await k.pageBreak();
    k.text(" • ", bulletX, k.y, { bold: false });
    const sikaX = bulletX + k.measure(" • ", { bold: false });
    k.text("SIKA", sikaX, k.y, { bold: true });
    
    // Add SIKA type if available (not bold, same line)
    if (s.sika_type) {
      const sikaTextWidth = k.measure("SIKA", { bold: true });
      const sikaTypeX = sikaX + sikaTextWidth + k.measure(" ", { bold: false });
      k.text(` ${s.sika_type}`, sikaTypeX, k.y, { bold: false });
    }
    k.y -= k.lineGap;
    
    await k.pageBreak();
    const sikaNum = s.sika_number || '[Nomor SIKA]';
    const sikaDate = s.sika_date ? fmtDateID(s.sika_date) : '[Tanggal SIKA]';
    await k.wrap(`   No. ${sikaNum} Tanggal ${sikaDate}`, rightX, rightW, { bold: true });
    k.y -= k.lineGap * 0.2;
    
    // HSSE Pass section (jika ada)
    if (s.hsse_pass_number || s.hsse_pass_valid_thru) {
      await k.pageBreak();
      k.text(" • ", bulletX, k.y, { bold: false });
      const hsseX = bulletX + k.measure(" • ", { bold: false });
      k.text("HSSE Pass", hsseX, k.y, { bold: true });
      k.y -= k.lineGap;
      
      await k.pageBreak();
      const hsseNum = s.hsse_pass_number || '[Nomor HSSE Pass]';
      const hsseValidThru = s.hsse_pass_valid_thru ? fmtDateID(s.hsse_pass_valid_thru) : '[Berlaku Sampai]';
      await k.wrap(`   No. ${hsseNum} Berlaku sampai ${hsseValidThru}`, rightX, rightW, { bold: true });
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

  // Add second page with supporting documents (SIMJA, SIKA, HSSE Pass) if available
  const hasDocuments = s.simja_document_upload || s.sika_document_upload || s.hsse_pass_document_upload;
  if (hasDocuments) {
    await addSupportingDocumentsPage(k, s);
  }

  // Add worker photos page if available
  // Handle both workerList (interface) and worker_list (database)
  const workerData = s.workerList || (s as any).worker_list;
  if (workerData && workerData.length > 0) {
    await addWorkerPhotosPage(k, workerData);
  }

  return k.doc.save();
}

import { loadWorkerPhoto, loadWorkerDocument, preloadWorkerPhotos } from './imageLoader';

/**
 * Add page with supporting documents (SIMJA, SIKA, HSSE Pass)
 * Documents are displayed in a grid layout: 2 columns x 2 rows
 */
async function addSupportingDocumentsPage(
  k: PDFKit,
  s: SubmissionPDFData
) {
  console.log('[AddSupportingDocumentsPage] Creating documents page...');
  
  // Add new page for documents with specific header type
  await k.addPage('documents');
  
  const { page } = k;
  const { width, height } = page.getSize();
  
 

  
  // Calculate layout for documents (2 columns x 2 rows)
  const columns = 2;
  const docWidth = 220;  // Width for each document
  const docHeight = 280; // Height for each document
  const horizontalGap = 30;
  const verticalGap = 30;
  const startY = height - 140;
  
  // Calculate starting X to center the grid
  const totalWidth = (docWidth * columns) + (horizontalGap * (columns - 1));
  const startX = (width - totalWidth) / 2;
  
  const documents = [];
  
  // Collect documents to display
  if (s.simja_document_upload) {
    documents.push({
      path: s.simja_document_upload,
      title: 'SIMJA',
      subtitle: s.simja_type || '',
      number: s.simja_number || '-',
      date: s.simja_date ? fmtDateID(s.simja_date) : '-'
    });
  }
  
  if (s.sika_document_upload) {
    documents.push({
      path: s.sika_document_upload,
      title: 'SIKA',
      subtitle: s.sika_type || '',
      number: s.sika_number || '-',
      date: s.sika_date ? fmtDateID(s.sika_date) : '-'
    });
  }
  
  if (s.hsse_pass_document_upload) {
    documents.push({
      path: s.hsse_pass_document_upload,
      title: 'HSSE Pass',
      subtitle: '',
      number: s.hsse_pass_number || '-',
      date: s.hsse_pass_valid_thru ? fmtDateID(s.hsse_pass_valid_thru) : '-'
    });
  }
  
  console.log(`[AddSupportingDocumentsPage] Found ${documents.length} documents to display`);
  
  // Draw each document
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc) continue; // TypeScript safety check
    
    const row = Math.floor(i / columns);
    const col = i % columns;
    
    const x = startX + (col * (docWidth + horizontalGap));
    const y = startY - (row * (docHeight + verticalGap));
    
    console.log(`[AddSupportingDocumentsPage] Drawing ${doc.title} at position (${x}, ${y})`);
    
    // Draw document frame
    page.drawRectangle({
      x: x,
      y: y - docHeight,
      width: docWidth,
      height: docHeight,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });
    
    // Draw document title only (no subtitle, no number, no date)
    const titleY = y - 15;
    k.text(doc.title, x + 10, titleY, { bold: true, size: 12 });
    
    // Load and draw document image/PDF - Use more space since we removed info
    const imageY = titleY - 10; // Start image closer to title
    const imageHeight = docHeight - 30; // More space for document (removed info section)
    const imageWidth = docWidth - 20;
    
    try {
      const documentResult = await loadWorkerDocument(k.doc, doc.path);
      
      if (documentResult.type === 'image' && documentResult.image) {
        // Draw image
        const img = documentResult.image;
        const imgDims = img.scale(1);
        const aspectRatio = imgDims.width / imgDims.height;
        
        let drawWidth = imageWidth;
        let drawHeight = imageHeight;
        
        if (aspectRatio > (imageWidth / imageHeight)) {
          drawHeight = drawWidth / aspectRatio;
        } else {
          drawWidth = drawHeight * aspectRatio;
        }
        
        const drawX = x + 10 + (imageWidth - drawWidth) / 2;
        const drawY = imageY - drawHeight;
        
        page.drawImage(img, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        
        console.log(`[AddSupportingDocumentsPage] ✅ ${doc.title} image drawn successfully`);
        
      } else if (documentResult.type === 'pdf' && documentResult.pdfPages) {
        // Embed first page of PDF
        const embeddedPages = await k.doc.embedPdf(documentResult.pdfPages, [0]);
        const embeddedPage = embeddedPages[0];
        
        if (embeddedPage) {
          const pageDims = embeddedPage.scale(1);
          const aspectRatio = pageDims.width / pageDims.height;
          
          let drawWidth = imageWidth;
          let drawHeight = imageHeight;
          
          if (aspectRatio > (imageWidth / imageHeight)) {
            drawHeight = drawWidth / aspectRatio;
          } else {
            drawWidth = drawHeight * aspectRatio;
          }
          
          const drawX = x + 10 + (imageWidth - drawWidth) / 2;
          const drawY = imageY - drawHeight;
          
          page.drawPage(embeddedPage, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
          
          console.log(`[AddSupportingDocumentsPage] ✅ ${doc.title} PDF drawn successfully`);
        }
        
      } else {
        // Draw placeholder for error
        const placeholderY = imageY - imageHeight / 2;
        k.text('Dokumen tidak tersedia', x + 10, placeholderY, {
          size: 10,
          color: rgb(0.6, 0.6, 0.6),
        });
        console.warn(`[AddSupportingDocumentsPage] ⚠️ ${doc.title} failed to load: ${documentResult.error || 'unknown'}`);
      }
      
    } catch (error) {
      console.error(`[AddSupportingDocumentsPage] ❌ Error loading ${doc.title}:`, error);
      const placeholderY = imageY - imageHeight / 2;
      k.text('Error memuat dokumen', x + 10, placeholderY, {
        size: 10,
        color: rgb(0.8, 0.2, 0.2),
      });
    }
  }
  
  console.log('[AddSupportingDocumentsPage] Documents page completed');
}

/**
 * Add second page with worker photos and HSSE documents
 */
async function addWorkerPhotosPage(
  k: PDFKit, 
  workerList: Array<{ 
    worker_name: string; 
    worker_photo?: string | null;
    hsse_pass_number?: string | null;
    hsse_pass_valid_thru?: Date | string | null;
    hsse_pass_document_upload?: string | null;
  }>
) {
  // Only proceed if there are workers
  if (!workerList || workerList.length === 0) {
    return;
  }

  // Preload all worker photos in batch for better performance
  await preloadWorkerPhotos(k.doc, workerList);

  // Add new page - header akan otomatis ditambahkan with workers type
  await k.addPage('workers');

  // Calculate grid layout for 2 columns x 3 rows (6 workers per page)
  const columns = 2; // 2 kolom
  const rows = 3; // 3 baris
  const workersPerPage = columns * rows; // 6 pekerja per halaman
  
  // Item dimensions: each worker gets foto + dokumen side by side in a cell
  const cellWidth = 240; // Width untuk satu cell (foto + dokumen)
  const cellHeight = 180; // Height untuk gambar + text
  const imageHeight = 130; // Height untuk gambar (foto + dokumen)
  const imageWidth = 110; // Width untuk setiap gambar (foto atau dokumen)
  const imageGap = 10; // Gap antara foto dan dokumen dalam satu cell
  
  const horizontalGap = 30; // Gap between columns
  const verticalGap = 15; // Gap between rows
  
  // Calculate margins to center the grid
  const totalGridWidth = (cellWidth * columns) + (horizontalGap * (columns - 1));
  const marginHorizontal = (A4.w - totalGridWidth) / 2;
  
  const startY = A4.h - 140; // Start position to fit header
  let workerIndex = 0;

  // Process workers in batches of workersPerPage
  while (workerIndex < workerList.length) {
    // Add new page if not first batch
    if (workerIndex > 0) {
      await k.addPage('workers');
    }
    
    // Draw workers for current page (up to workersPerPage)
    const endIndex = Math.min(workerIndex + workersPerPage, workerList.length);
    
    for (let i = workerIndex; i < endIndex; i++) {
      const worker = workerList[i];
      if (!worker) continue;
      
      // Calculate grid position (which cell in 2x3 grid)
      const positionInPage = i - workerIndex; // 0-5
      const col = positionInPage % columns; // 0 or 1
      const row = Math.floor(positionInPage / columns); // 0, 1, or 2
      
      // Calculate X position for this column
      const cellX = marginHorizontal + (col * (cellWidth + horizontalGap));
      const photoX = cellX;
      const documentX = cellX + imageWidth + imageGap;
      
      // Calculate Y position for this row
      const y = startY - (row * (cellHeight + verticalGap));
      
      // Draw worker photo and document
      await drawWorkerPhotoAndDocument(
        k.page, k.doc, k.font, k.bold, 
        worker, 
        photoX,
        documentX,
        y, 
        imageWidth,
        imageHeight
      );
    }
    
    // Move to next batch
    workerIndex = endIndex;
  }
}

/**
 * Draw worker photo and HSSE document side by side
 */
async function drawWorkerPhotoAndDocument(
  page: any,
  doc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  worker: { 
    worker_name: string; 
    worker_photo?: string | null;
    hsse_pass_number?: string | null;
    hsse_pass_valid_thru?: Date | string | null;
    hsse_pass_document_upload?: string | null;
  },
  photoX: number,
  documentX: number,
  y: number,
  itemWidth: number,
  itemHeight: number
) {
  const imageHeight = itemHeight; // Use full itemHeight for images
  
  // === LEFT SIDE: WORKER PHOTO ===
  // Draw photo frame
  page.drawRectangle({
    x: photoX,
    y: y - imageHeight,
    width: itemWidth,
    height: imageHeight,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  // Load and draw photo if available (NO LABEL - full frame)
  if (worker.worker_photo) {
    console.log(`[DrawWorkerPhoto] Loading photo for worker: ${worker.worker_name}`);
    const photoImage = await loadWorkerPhoto(doc, worker.worker_photo);
    
    if (photoImage) {
      console.log(`[DrawWorkerPhoto] ✅ Photo loaded successfully for: ${worker.worker_name}`);
      try {
        // Calculate dimensions to maintain aspect ratio
        const imgDims = photoImage.scale(1);
        const imgAspectRatio = imgDims.width / imgDims.height;
        const frameAspectRatio = itemWidth / imageHeight; // Use full frame height
        
        let drawWidth = itemWidth - 2; // Padding 1px each side
        let drawHeight = imageHeight - 2; // Padding 1px each side
        let drawX = photoX + 1;
        let drawY = y - imageHeight + 1;
        
        // Adjust dimensions to fit within frame while maintaining aspect ratio
        if (imgAspectRatio > frameAspectRatio) {
          drawHeight = drawWidth / imgAspectRatio;
          drawY = y - (imageHeight + drawHeight) / 2;
        } else {
          drawWidth = drawHeight * imgAspectRatio;
          drawX = photoX + (itemWidth - drawWidth) / 2;
        }
        
        page.drawImage(photoImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        console.log(`[DrawWorkerPhoto] ✅ Photo drawn at (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
      } catch (error) {
        console.error(`[DrawWorkerPhoto] ❌ Error drawing photo for ${worker.worker_name}:`, error);
        
        // Draw error placeholder (smaller text)
        page.drawText("Error", { 
          x: photoX + itemWidth/2 - 15, 
          y: y - imageHeight/2 + 5, 
          size: 7, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
        page.drawText("loading", { 
          x: photoX + itemWidth/2 - 15, 
          y: y - imageHeight/2 - 5, 
          size: 7, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
      }
    } else {
      console.warn(`[DrawWorkerPhoto] ⚠️ Photo not loaded for worker: ${worker.worker_name}`);
      // Draw placeholder for failed load (smaller text)
      page.drawText("Foto", { 
        x: photoX + itemWidth/2 - 12, 
        y: y - imageHeight/2 + 5, 
        size: 7, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
      page.drawText("tidak ada", { 
        x: photoX + itemWidth/2 - 18, 
        y: y - imageHeight/2 - 5, 
        size: 7, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
    }
  } else {
    console.log(`[DrawWorkerPhoto] No photo path provided for worker: ${worker.worker_name}`);
    // Draw placeholder for no photo (smaller text)
    page.drawText("Tidak", { 
      x: photoX + itemWidth/2 - 12, 
      y: y - imageHeight/2 + 5, 
      size: 7, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
    page.drawText("ada foto", { 
      x: photoX + itemWidth/2 - 18, 
      y: y - imageHeight/2 - 5, 
      size: 7, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
  }

  // === RIGHT SIDE: HSSE DOCUMENT ===
  // Draw document frame
  page.drawRectangle({
    x: documentX,
    y: y - imageHeight,
    width: itemWidth,
    height: imageHeight,
    borderColor: rgb(0.8, 0.8, 0.8),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.98),
  });

  // Load and draw HSSE document if available (NO LABEL - full frame)
  if (worker.hsse_pass_document_upload) {
    console.log(`[DrawHSSEDocument] Loading document for ${worker.worker_name}: ${worker.hsse_pass_document_upload}`);
    const documentResult = await loadWorkerDocument(doc, worker.hsse_pass_document_upload);
    console.log(`[DrawHSSEDocument] Result for ${worker.worker_name}: type=${documentResult.type}, error=${documentResult.error || 'none'}`);
    
    if (documentResult.type === 'image' && documentResult.image) {
      console.log(`[DrawHSSEDocument] ✅ Processing as IMAGE for ${worker.worker_name}`);
      try {
        // Calculate dimensions to maintain aspect ratio
        const imgDims = documentResult.image.scale(1);
        const imgAspectRatio = imgDims.width / imgDims.height;
        const frameAspectRatio = itemWidth / imageHeight; // Use full frame height
        
        let drawWidth = itemWidth - 2; // Padding 1px each side
        let drawHeight = imageHeight - 2; // Padding 1px each side
        let drawX = documentX + 1;
        let drawY = y - imageHeight + 1;
        
        if (imgAspectRatio > frameAspectRatio) {
          drawHeight = drawWidth / imgAspectRatio;
          drawY = y - (imageHeight + drawHeight) / 2;
        } else {
          drawWidth = drawHeight * imgAspectRatio;
          drawX = documentX + (itemWidth - drawWidth) / 2;
        }
        
        page.drawImage(documentResult.image, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight,
        });
        
        console.log(`[DrawHSSEDocument] ✅ Image drawn at (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
      } catch (error) {
        console.error(`[DrawHSSEDocument] ❌ Error drawing image for ${worker.worker_name}:`, error);
        
        // Draw error placeholder
        page.drawText("Error", { 
          x: documentX + itemWidth/2 - 15, 
          y: y - imageHeight/2 + 5, 
          size: 7, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
        page.drawText("loading", { 
          x: documentX + itemWidth/2 - 15, 
          y: y - imageHeight/2 - 5, 
          size: 7, 
          font: font,
          color: rgb(0.8, 0.2, 0.2) 
        });
      }
    } else if (documentResult.type === 'pdf' && documentResult.pdfPages) {
      console.log(`[DrawHSSEDocument] ✅ Processing as PDF for ${worker.worker_name}`);
      try {
        // For PDF documents, embed first page using pdf-lib embedPages
        console.log(`[DrawHSSEDocument] Embedding PDF page...`);
        
        const sourcePdf = documentResult.pdfPages;
        
        // Embed the first page from the source PDF
        const [embeddedPage] = await doc.embedPages([sourcePdf.getPage(0)]);
        
        if (!embeddedPage) {
          throw new Error('Failed to embed PDF page');
        }
        
        console.log(`[DrawHSSEDocument] ✅ PDF page embedded successfully`);
        
        // Get embedded page dimensions
        const { width: pdfWidth, height: pdfHeight } = embeddedPage.scale(1);
        
        // Calculate target dimensions to fit in the document frame with padding
        const targetWidth = itemWidth - 2; // Padding 1px each side
        const targetHeight = imageHeight - 2; // Padding 1px each side
        
        // Calculate scale to fit while maintaining aspect ratio
        const scaleX = targetWidth / pdfWidth;
        const scaleY = targetHeight / pdfHeight;
        const scale = Math.min(scaleX, scaleY, 1.0); // Don't upscale
        
        const scaledWidth = pdfWidth * scale;
        const scaledHeight = pdfHeight * scale;
        
        // Calculate position to center the page
        const drawX = documentX + 1 + (targetWidth - scaledWidth) / 2;
        const drawY = y - imageHeight + 1 + (targetHeight - scaledHeight) / 2;
        
        // Draw the embedded page on the current page
        page.drawPage(embeddedPage, {
          x: drawX,
          y: drawY,
          width: scaledWidth,
          height: scaledHeight,
        });
        
        console.log(`[DrawHSSEDocument] ✅ PDF page drawn at (${drawX}, ${drawY}) with size ${scaledWidth}x${scaledHeight}`);
        
      } catch (error) {
        console.error(`[DrawHSSEDocument] ❌ Error embedding PDF for ${worker.worker_name}:`, error);
        
        // Draw simple placeholder text without emoji
        page.drawText("PDF", { 
          x: documentX + itemWidth/2 - 10, 
          y: y - imageHeight/2 + 15, 
          size: 10, 
          font: boldFont,
          color: rgb(0.2, 0.4, 0.8) 
        });
        page.drawText("Dokumen", { 
          x: documentX + itemWidth/2 - 18, 
          y: y - imageHeight/2 + 2, 
          size: 7, 
          font: font,
          color: rgb(0.4, 0.4, 0.4) 
        });
        page.drawText("Tersedia", { 
          x: documentX + itemWidth/2 - 18, 
          y: y - imageHeight/2 - 8, 
          size: 7, 
          font: font,
          color: rgb(0.4, 0.4, 0.4) 
        });
      }
    } else {
      console.warn(`[DrawHSSEDocument] ⚠️ Failed to load document for ${worker.worker_name}: ${documentResult.error || 'unknown error'}`);
      // Draw error/unavailable placeholder
      const errorText = documentResult.error || 'Dokumen Error';
      
      page.drawText("Dokumen", { 
        x: documentX + itemWidth/2 - 20, 
        y: y - imageHeight/2 + 10, 
        size: 7, 
        font: font,
        color: rgb(0.6, 0.6, 0.6) 
      });
      page.drawText("error", { 
        x: documentX + itemWidth/2 - 12, 
        y: y - imageHeight/2 - 2, 
        size: 7, 
        font: font,
        color: rgb(0.8, 0.2, 0.2) 
      });
      console.warn(`[DrawHSSEDocument] Error details: ${errorText}`);
    }
  } else {
    console.log(`[DrawHSSEDocument] No document path provided for ${worker.worker_name}`);
    // Draw placeholder for no document (smaller text)
    page.drawText("Tidak", { 
      x: documentX + itemWidth/2 - 12, 
      y: y - imageHeight/2 + 5, 
      size: 7, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
    page.drawText("ada dok", { 
      x: documentX + itemWidth/2 - 18, 
      y: y - imageHeight/2 - 5, 
      size: 7, 
      font: font,
      color: rgb(0.6, 0.6, 0.6) 
    });
  }

  // === WORKER INFO BELOW IMAGES (Left-aligned, starting from photo position) ===
  const topPadding = 15; // Padding atas untuk memberikan jarak dari gambar
  const textStartY = y - imageHeight - topPadding; // Start text dengan padding
  const lineSpacing = 12; // Jarak antar baris
  const leftX = photoX; // Start from photo position (left-aligned)
  
  // Line 1: Worker Name (bold, left-aligned)
  const nameText = worker.worker_name;
  const nameFontSize = 10;
  
  page.drawText(nameText, {
    x: leftX,
    y: textStartY,
    size: nameFontSize,
    font: boldFont,
    color: rgb(0, 0, 0)
  });
  
  // Line 2: HSSE Number - Valid Thru (left-aligned below name)
  if (worker.hsse_pass_number && worker.hsse_pass_valid_thru) {
    const validThruDate = typeof worker.hsse_pass_valid_thru === 'string' 
      ? new Date(worker.hsse_pass_valid_thru)
      : worker.hsse_pass_valid_thru;
    
    const hsseText = `${worker.hsse_pass_number} - ${fmtDateID(validThruDate)}`;
    const hsseFontSize = 9;
    
    page.drawText(hsseText, {
      x: leftX,
      y: textStartY - lineSpacing,
      size: hsseFontSize,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
  } else if (worker.hsse_pass_number) {
    // Jika hanya ada nomor HSSE tanpa tanggal
    const hsseText = worker.hsse_pass_number;
    const hsseFontSize = 9;
    
    page.drawText(hsseText, {
      x: leftX,
      y: textStartY - lineSpacing,
      size: hsseFontSize,
      font: font,
      color: rgb(0.2, 0.2, 0.2)
    });
  }
}
