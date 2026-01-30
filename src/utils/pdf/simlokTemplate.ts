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
// 🎯 PERFORMANCE: Cache logo to avoid reloading it for every PDF
let cachedLogoBuffer: Buffer | null = null;

/**
 * Load logo image for PDF generation
 * Works both on client-side (fetch) and server-side (fs)
 * 🎯 OPTIMIZED: Cache logo buffer for reuse
 * 🎯 CRITICAL FIX: Optimize PNG to use baseline compression compatible with pdf-lib
 */
async function loadLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoPath = '/assets/logo_pertamina.png';
    
    // Try to embed cached buffer with error handling
    if (cachedLogoBuffer) {
      try {
        return await pdfDoc.embedPng(cachedLogoBuffer);
      } catch (embedError) {
        console.warn('Failed to embed cached logo, reloading:', embedError);
        cachedLogoBuffer = null; // Clear bad cache
      }
    }
    
    let rawBuffer: Buffer;
    
    if (typeof window !== 'undefined') {
      // Client-side: use fetch
      const response = await fetch(logoPath);
      if (!response.ok) return null;
      const logoBytes = await response.arrayBuffer();
      rawBuffer = Buffer.from(logoBytes);
    } else {
      // Server-side: use file system
      const fs = await import('fs');
      const path = await import('path');
      const logoFilePath = path.join(process.cwd(), 'public', logoPath);
      
      if (!fs.existsSync(logoFilePath)) return null;
      rawBuffer = fs.readFileSync(logoFilePath);
    }
    
    // 🎯 CRITICAL FIX: Optimize PNG to baseline compression for pdf-lib compatibility
    // This prevents "Unknown compression method" errors
    if (typeof window === 'undefined') {
      try {
        const sharp = (await import('sharp')).default;
        // Convert to baseline PNG with compatible compression
        cachedLogoBuffer = await sharp(rawBuffer)
          .png({
            compressionLevel: 6, // Balanced compression
            progressive: false,  // Baseline PNG for compatibility
            adaptiveFiltering: false // Disable advanced features
          })
          .toBuffer();
        
        console.log(`✅ Logo optimized: ${rawBuffer.length} → ${cachedLogoBuffer.length} bytes`);
      } catch (optimizeError) {
        console.warn('Logo optimization failed, using raw buffer:', optimizeError);
        cachedLogoBuffer = rawBuffer;
      }
    } else {
      cachedLogoBuffer = rawBuffer;
    }
    
    // Try to embed optimized buffer
    try {
      return await pdfDoc.embedPng(cachedLogoBuffer);
    } catch (embedError) {
      console.error('Failed to embed logo as PNG:', embedError);
      // Clear cache and return null to skip logo
      cachedLogoBuffer = null;
      return null;
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


/** Hapus newline ganda & spasi berlebih agar wrap presisi */
function normalizeInline(s?: string | null) {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Sanitize Unicode characters yang tidak bisa di-encode dengan WinAnsi font
 * Mengganti character problematic dengan ASCII equivalent
 */
function sanitizeForPDF(text: string): string {
  if (!text) return text;
  
  // Replace common Unicode characters yang tidak support di WinAnsi
  const sanitized = text
    // Minus sign (U+2212) → hyphen (-)
    .replace(/−/g, '-')
    // En dash (U+2013) → hyphen (-)
    .replace(/–/g, '-')
    // Em dash (U+2014) → hyphen (-)
    .replace(/—/g, '-')
    // Left single quote (U+2018) → apostrophe (')
    .replace(/'/g, "'")
    // Right single quote (U+2019) → apostrophe (')
    .replace(/'/g, "'")
    // Left double quote (U+201C) → quote (")
    .replace(/"/g, '"')
    // Right double quote (U+201D) → quote (")
    .replace(/"/g, '"')
    // Bullet (U+2022) → asterisk (*)
    .replace(/•/g, '*')
    // Ellipsis (U+2026) → three dots (...)
    .replace(/…/g, '...')
    // Multiplication sign (U+00D7) → x
    .replace(/×/g, 'x')
    // Division sign (U+00F7) → forward slash (/)
    .replace(/÷/g, '/');
  
  return sanitized;
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
  currentDocumentType?: string; // Track current document type for footer label

  async init() {
    this.doc = await PDFDocument.create();
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.font = await this.doc.embedFont(StandardFonts.Helvetica);
    this.bold = await this.doc.embedFont(StandardFonts.HelveticaBold);
    this.pageCount = 1;
  }

  async addPage(pageType?: 'documents' | 'workers' | 'signature') {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.pageCount++;
    this.x = MARGIN;
    
    // Add header to pages 2 and beyond (except signature page)
    if (this.pageCount > 1 && this.submissionData && pageType !== 'signature') {
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
      // Use current document type if available, otherwise use generic label
      if (this.currentDocumentType) {
        switch (this.currentDocumentType) {
          case 'SIMJA':
            labelText = "Dokumen SIMJA ";
            break;
          case 'SIKA':
            labelText = "Dokumen SIKA ";
            break;
          case 'WORK_ORDER':
            labelText = "Dokumen Work Order ";
            break;
          case 'KONTRAK_KERJA':
            labelText = "Dokumen Kontrak Kerja ";
            break;
          case 'JSA':
            labelText = "Dokumen JSA ";
            break;
          default:
            labelText = "Dokumen Pendukung ";
        }
      } else {
        labelText = "Dokumen Pendukung ";
      }
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
    // Sanitize text sebelum measure untuk menghindari Unicode encoding error
    const sanitizedText = sanitizeForPDF(text);
    return f.widthOfTextAtSize(sanitizedText, size);
  }

  text(
    t: string,
    x: number,
    y: number,
    o?: { size?: number; bold?: boolean; color?: RGB }
  ) {
    // Sanitize text untuk menghindari Unicode encoding error
    const sanitizedText = sanitizeForPDF(t);
    this.page.drawText(sanitizedText, {
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
    // Sanitize text untuk menghindari Unicode encoding error
    const sanitizedText = sanitizeForPDF(t);
    const size = o?.size ?? this.fs;
    const f = o?.bold ? this.bold : this.font;
    const words = sanitizedText.split(/\s+/);
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? line + " " + w : w;
      // Double-sanitize untuk memastikan tidak ada karakter Unicode yang lolos
      const safeTest = sanitizeForPDF(test);
      const width = f.widthOfTextAtSize(safeTest, size);
      if (width > maxW && line) {
        lines.push(line);
        line = w;
      } else line = test;
    }
    if (line) lines.push(line);
    for (const ln of lines) {
      await this.pageBreak();
      // Sanitize final line sebelum di-render
      this.text(sanitizeForPDF(ln), x, this.y, { size, bold: o?.bold ?? false });
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
    const value = sanitizeForPDF((rawValue ?? "").toString());
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
  // Use Jakarta timezone for PDF metadata timestamps
  const jakartaNowStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const currentDate = new Date(jakartaNowStr);
  
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

  // Format berdasarkan dari field based_on yang sudah di-generate dari SIMJA documents di backend
  const berdasarkan = s.based_on || "Surat Permohonan Izin Kerja";
  
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
  
  // Jam Kerja - tampilkan terpisah jika ada holiday_working_hours
  if (s.holiday_working_hours && s.holiday_working_hours.trim().length > 0) {
    // Jika ada jam kerja hari libur, tampilkan dalam 2 baris
    await k.numberedRow(6, "Jam Kerja", `Mulai pukul ${s.working_hours} (Hari kerja)`);
    
    // Baris kedua untuk hari libur - sejajar dengan waktu hari kerja
    const rightX = k.x + k.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    
    // Hitung offset untuk mensejajarkan dengan waktu (skip "Mulai pukul ")
    const prefixWidth = k.measure("Mulai pukul ", { size: k.fs });
    
    await k.wrap(`${s.holiday_working_hours} (Hari libur)`, rightX + prefixWidth, rightW - prefixWidth, { bold: false });
  } else {
    // Jika tidak ada jam kerja hari libur, tampilkan normal
    await k.numberedRow(6, "Jam Kerja", `Mulai pukul ${s.working_hours}`);
  }
  
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
    // Generate template based on available data (new or legacy structure)
    await k.pageBreak();
    
    // Label kiri (bold)
    const left = "7. Lain-lain";
    k.text(left, k.x, k.y, { bold: false });

    // Titik dua di kolom tengah
    const colonX = k.x + k.leftLabelWidth - k.measure(":", { size: k.fs }) - 2;
    k.text(":", colonX, k.y);

    // Generate content based on available documents
    const rightX = k.x + k.leftLabelWidth + 4;
    const rightW = A4.w - MARGIN - rightX;
    
    // Line 1: Introduction
    await k.wrap(" Izin diberikan berdasarkan :", rightX, rightW, { bold: false });
    
    // Minimal spacing
    k.y -= k.lineGap * 0.2;
    
    const bulletX = rightX;
    
    // Check for new support_documents structure
    if (s.support_documents && s.support_documents.length > 0) {
      // Group by type
      const simjaDocs = s.support_documents.filter(d => d.document_type === 'SIMJA');
      const sikaDocs = s.support_documents.filter(d => d.document_type === 'SIKA');
      const workOrderDocs = s.support_documents.filter(d => d.document_type === 'WORK_ORDER');
      const kontrakKerjaDocs = s.support_documents.filter(d => d.document_type === 'KONTRAK_KERJA');
      const jsaDocs = s.support_documents.filter(d => d.document_type === 'JSA');
      
      // SIMJA documents
      if (simjaDocs.length > 0) {
        for (const doc of simjaDocs) {
          if (!doc) continue;
          await k.pageBreak();
          k.text(" • ", bulletX, k.y, { bold: false });
          const docX = bulletX + k.measure(" • ", { bold: false });
          k.text("SIMJA", docX, k.y, { bold: true });
          
          if (doc.document_subtype) {
            const typeWidth = k.measure("SIMJA", { bold: true });
            const subtypeX = docX + typeWidth + k.measure(" ", { bold: false });
            k.text(` ${doc.document_subtype}`, subtypeX, k.y, { bold: false });
          }
          k.y -= k.lineGap;
          
          await k.pageBreak();
          const docNum = doc.document_number || '[Nomor]';
          const docDate = doc.document_date ? fmtDateID(doc.document_date) : '[Tanggal]';
          await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
          k.y -= k.lineGap * 0.2;
        }
      }
      
      // SIKA documents
      if (sikaDocs.length > 0) {
        for (const doc of sikaDocs) {
          if (!doc) continue;
          await k.pageBreak();
          k.text(" • ", bulletX, k.y, { bold: false });
          const docX = bulletX + k.measure(" • ", { bold: false });
          k.text("SIKA", docX, k.y, { bold: true });
          
          if (doc.document_subtype) {
            const typeWidth = k.measure("SIKA", { bold: true });
            const subtypeX = docX + typeWidth + k.measure(" ", { bold: false });
            k.text(` ${doc.document_subtype}`, subtypeX, k.y, { bold: false });
          }
          k.y -= k.lineGap;
          
          await k.pageBreak();
          const docNum = doc.document_number || '[Nomor]';
          const docDate = doc.document_date ? fmtDateID(doc.document_date) : '[Tanggal]';
          await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
          k.y -= k.lineGap * 0.2;
        }
      }
      
      // Work Order documents
      if (workOrderDocs.length > 0) {
        for (const doc of workOrderDocs) {
          if (!doc) continue;
          await k.pageBreak();
          k.text(" • ", bulletX, k.y, { bold: false });
          const docX = bulletX + k.measure(" • ", { bold: false });
          k.text("Work Order", docX, k.y, { bold: true });
          k.y -= k.lineGap;
          
          await k.pageBreak();
          const docNum = doc.document_number || '[Nomor]';
          const docDate = doc.document_date ? fmtDateID(doc.document_date) : '[Tanggal]';
          await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
          k.y -= k.lineGap * 0.2;
        }
      }

      // Kontrak Kerja documents
      if (kontrakKerjaDocs.length > 0) {
        for (const doc of kontrakKerjaDocs) {
          if (!doc) continue;
          await k.pageBreak();
          k.text(" • ", bulletX, k.y, { bold: false });
          const docX = bulletX + k.measure(" • ", { bold: false });
          k.text("Kontrak Kerja", docX, k.y, { bold: true });
          k.y -= k.lineGap;
          
          await k.pageBreak();
          const docNum = doc.document_number || '[Nomor]';
          const docDate = doc.document_date ? fmtDateID(doc.document_date) : '[Tanggal]';
          await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
          k.y -= k.lineGap * 0.2;
        }
      }

      // JSA documents
      if (jsaDocs.length > 0) {
        for (const doc of jsaDocs) {
          if (!doc) continue;
          await k.pageBreak();
          k.text(" • ", bulletX, k.y, { bold: false });
          const docX = bulletX + k.measure(" • ", { bold: false });
          k.text("Job Safety Analysis", docX, k.y, { bold: true });
          k.y -= k.lineGap;
          
          await k.pageBreak();
          const docNum = doc.document_number || '[Nomor]';
          const docDate = doc.document_date ? fmtDateID(doc.document_date) : '[Tanggal]';
          await k.wrap(`   No. ${docNum} Tanggal ${docDate}`, rightX, rightW, { bold: true });
          k.y -= k.lineGap * 0.2;
        }
      }
    } else {
      // Fallback to legacy structure
      // SIMJA section
      if (s.simja_number || s.simja_document_upload) {
        await k.pageBreak();
        k.text(" • ", bulletX, k.y, { bold: false });
        const simjaX = bulletX + k.measure(" • ", { bold: false });
        k.text("SIMJA", simjaX, k.y, { bold: true });
        
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
      }
      
      // SIKA section
      if (s.sika_number || s.sika_document_upload) {
        await k.pageBreak();
        k.text(" • ", bulletX, k.y, { bold: false });
        const sikaX = bulletX + k.measure(" • ", { bold: false });
        k.text("SIKA", sikaX, k.y, { bold: true });
        
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
      }
      
      // HSSE Pass section
      if (s.hsse_pass_number || s.hsse_pass_document_upload) {
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
    }
    
    // Head of Security section with bold date
    await k.pageBreak();
    await k.wrap(" ", rightX, rightW, { bold: false });
    
    await k.pageBreak();
    await k.wrap(`  Diterima oleh ${s.signer_position || '[Jabatan]'}:`, rightX, rightW, { bold: false });
    
    await k.pageBreak();
    // Use placeholder if simlok_date is not set
    const simlokDate = s.simlok_date ? fmtDateID(s.simlok_date) : '[Tanggal Disetujui]';
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
  // const dateFromPelaksanaan = extractDateFromPelaksanaan(s.implementation);
  const displayDate = toDate(s.simlok_date);

  // Count total documents to determine if signature should be on new page
  let totalDocuments = 0;
  if (s.support_documents && s.support_documents.length > 0) {
    totalDocuments = s.support_documents.length;
  } else {
    // Count legacy documents
    if (s.simja_document_upload) totalDocuments++;
    if (s.sika_document_upload) totalDocuments++;
    if (s.hsse_pass_document_upload) totalDocuments++;
  }

  const shouldMoveSignatureToNewPage = totalDocuments > 7;

  if (!shouldMoveSignatureToNewPage) {
    // Original behavior: Show signature on main page
    // Right side - Location and Date (above Head title)
    k.text("Dikeluarkan di : Jakarta", A4.w - 230, signatureY, { size: 11 });
    const dateText = displayDate ? fmtDateID(displayDate) : "[Tanggal Disetujui]";
    k.text("Pada tanggal : " + dateText, A4.w - 230, signatureY - 15, { size: 11 });

    // Right side - Head title and name (below location/date)
    const jabatanSigner = s.signer_position || "[Jabatan]";
    const namaSigner = s.signer_name || "[Nama Penandatangan]";
    
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
  }

  // Add second page with supporting documents (SIMJA, SIKA, HSSE Pass) if available
  // Check both new support_documents structure and legacy fields
  const hasDocuments = (s.support_documents && s.support_documents.length > 0) || 
                       s.simja_document_upload || 
                       s.sika_document_upload || 
                       s.hsse_pass_document_upload;
  
  // Add signature on new page if more than 5 documents
  if (shouldMoveSignatureToNewPage && hasDocuments) {
    await addSignaturePage(k, s, displayDate);
  }

  if (hasDocuments) {
    await addSupportingDocumentsPage(k, s);
  }

  // Add worker photos page if available
  // Handle both workerList (interface) and worker_list (database)
  const workerData = s.workerList || (s as any).worker_list;
  if (workerData && workerData.length > 0) {
    await addWorkerPhotosPage(k, workerData);
  }

  // 🎯 PERFORMANCE: Save PDF without compression options for faster generation
  // PDF compression can add 200-500ms to generation time
  return k.doc.save();
}

import { loadWorkerPhoto, loadWorkerDocument, preloadWorkerPhotos, convertPdfToImages } from './imageLoader';

/**
 * Add a dedicated signature page (when there are more than 5 documents)
 */
async function addSignaturePage(
  k: PDFKit,
  s: SubmissionPDFData,
  displayDate: Date | null
) {
  console.log('[AddSignaturePage] Creating signature page...');
  
  // Add new page for signature (without header)
  await k.addPage('signature');
  const page = k.page;
  
  // Add logo at top right
  const logoImage = await loadLogo(k.doc);
  if (logoImage) {
    const logoWidth = 120;
    const logoHeight = 40;
    const logoX = A4.w - logoWidth - 40;
    const logoY = A4.h - 60;
    
    page.drawImage(logoImage, {
      x: logoX,
      y: logoY,
      width: logoWidth,
      height: logoHeight,
    });
  }
  
  // Start position from top - no header text, just signature section
  k.y = A4.h - MARGIN - 100;
  
  // Position signature on the right side (same as original position in main page)
  const signatureY = k.y;
  
  // Right side - Location and Date (same position as original)
  k.text("Dikeluarkan di : Jakarta", A4.w - 230, signatureY, { size: 11 });
  const dateText = displayDate ? fmtDateID(displayDate) : "[Tanggal Disetujui]";
  k.text("Pada tanggal : " + dateText, A4.w - 230, signatureY - 15, { size: 11 });
  
  // Right side - Jabatan and nama
  const jabatanSigner = s.signer_position || "[Jabatan]";
  const namaSigner = s.signer_name || "[Nama Penandatangan]";
  
  // Calculate positions (same as original)
  const jabatanY = signatureY - 40;
  const namaY = signatureY - 145;
  
  // Draw jabatan
  k.text(jabatanSigner, A4.w - 230, jabatanY, { size: 11 });
  
  // Add QR code if available (same position as original)
  if (s.qrcode && s.approval_status === 'APPROVED') {
    const qrImage = await generateQRImage(k.doc, s.qrcode);
    if (qrImage) {
      const qrSize = 80; // Same size as original
      const qrX = 395; // Same position as original
      const qrY = signatureY - 130;
      
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
  
  console.log('[AddSignaturePage] Signature page created successfully');
}

/**
 * Add pages with supporting documents (SIMJA, SIKA, HSSE Pass)
 * Each output page shows maximum 2 document pages side by side.
 * For multi-page PDFs, pages continue on next output page.
 */
async function addSupportingDocumentsPage(
  k: PDFKit,
  s: SubmissionPDFData
) {
  console.log('[AddSupportingDocumentsPage] Creating documents pages...');
  
  // Collect all documents to display - GROUPED BY DOCUMENT TYPE
  interface DocInfo {
    path: string;
    title: string;
    subtitle?: string;
    number?: string;
    date?: string;
    documentType: string; // NEW: Track document type for grouping
  }
  
  const documents: DocInfo[] = [];
  
  // Check if new support_documents structure exists
  if (s.support_documents && s.support_documents.length > 0) {
    console.log('[AddSupportingDocumentsPage] Using new support_documents structure');
    console.log(`[AddSupportingDocumentsPage] Total support documents: ${s.support_documents.length}`);
    
    // Group by document type: SIMJA, SIKA, WORK_ORDER, KONTRAK_KERJA, JSA
    const simjaDocs = s.support_documents.filter(d => d.document_type === 'SIMJA');
    const sikaDocs = s.support_documents.filter(d => d.document_type === 'SIKA');
    const workOrderDocs = s.support_documents.filter(d => d.document_type === 'WORK_ORDER');
    const kontrakKerjaDocs = s.support_documents.filter(d => d.document_type === 'KONTRAK_KERJA');
    const jsaDocs = s.support_documents.filter(d => d.document_type === 'JSA');
    
    console.log(`[AddSupportingDocumentsPage] Document counts - SIMJA: ${simjaDocs.length}, SIKA: ${sikaDocs.length}, Work Order: ${workOrderDocs.length}, Kontrak Kerja: ${kontrakKerjaDocs.length}, JSA: ${jsaDocs.length}`);
    
    // Add SIMJA documents first
    simjaDocs.forEach(doc => {
      documents.push({
        path: doc.document_upload,
        title: 'SIMJA',
        subtitle: doc.document_subtype || '',
        number: doc.document_number || '-',
        date: doc.document_date ? fmtDateID(doc.document_date) : '-',
        documentType: 'SIMJA'
      });
    });
    
    // Add SIKA documents
    sikaDocs.forEach(doc => {
      documents.push({
        path: doc.document_upload,
        title: 'SIKA',
        subtitle: doc.document_subtype || '',
        number: doc.document_number || '-',
        date: doc.document_date ? fmtDateID(doc.document_date) : '-',
        documentType: 'SIKA'
      });
    });
    
    // Add Work Order documents
    workOrderDocs.forEach(doc => {
      documents.push({
        path: doc.document_upload,
        title: 'Work Order',
        subtitle: doc.document_subtype || '',
        number: doc.document_number || '-',
        date: doc.document_date ? fmtDateID(doc.document_date) : '-',
        documentType: 'WORK_ORDER'
      });
    });

    // Add Kontrak Kerja documents
    kontrakKerjaDocs.forEach(doc => {
      documents.push({
        path: doc.document_upload,
        title: 'Kontrak Kerja',
        subtitle: doc.document_subtype || '',
        number: doc.document_number || '-',
        date: doc.document_date ? fmtDateID(doc.document_date) : '-',
        documentType: 'KONTRAK_KERJA'
      });
    });

    // Add JSA documents
    jsaDocs.forEach(doc => {
      documents.push({
        path: doc.document_upload,
        title: 'Job Safety Analysis',
        subtitle: '',
        number: doc.document_number || '-',
        date: doc.document_date ? fmtDateID(doc.document_date) : '-',
        documentType: 'JSA'
      });
    });
  } else {
    // Fallback to legacy structure
    console.log('[AddSupportingDocumentsPage] Using legacy document structure');
    
    if (s.simja_document_upload) {
      documents.push({
        path: s.simja_document_upload,
        title: 'SIMJA',
        subtitle: s.simja_type || '',
        number: s.simja_number || '-',
        date: s.simja_date ? fmtDateID(s.simja_date) : '-',
        documentType: 'SIMJA'
      });
    }
    
    if (s.sika_document_upload) {
      documents.push({
        path: s.sika_document_upload,
        title: 'SIKA',
        subtitle: s.sika_type || '',
        number: s.sika_number || '-',
        date: s.sika_date ? fmtDateID(s.sika_date) : '-',
        documentType: 'SIKA'
      });
    }
    
    if (s.hsse_pass_document_upload) {
      documents.push({
        path: s.hsse_pass_document_upload,
        title: 'HSSE Pass',
        subtitle: '',
        number: s.hsse_pass_number || '-',
        date: s.hsse_pass_valid_thru ? fmtDateID(s.hsse_pass_valid_thru) : '-',
        documentType: 'HSSE'
      });
    }
  }
  
  console.log(`[AddSupportingDocumentsPage] Found ${documents.length} documents to process`);
  
  if (documents.length === 0) {
    console.log('[AddSupportingDocumentsPage] No documents to display');
    return;
  }
  
  // === OPTIMIZATION: Pre-convert all PDFs in parallel ===
  // Get unique PDF paths to avoid duplicate conversions
  const uniquePdfPaths = new Set<string>();
  const pdfDocuments: { doc: any; path: string }[] = [];
  
  // First pass: identify PDF documents
  console.log(`[AddSupportingDocumentsPage] 🔄 Pre-loading documents in parallel...`);
  const loadStartTime = Date.now();
  
  // Load all documents in parallel first
  const loadResults = await Promise.all(
    documents.map(async (doc) => {
      const documentResult = await loadWorkerDocument(k.doc, doc.path);
      return { doc, documentResult };
    })
  );
  
  console.log(`[AddSupportingDocumentsPage] ✅ Documents loaded in ${Date.now() - loadStartTime}ms`);
  
  // Identify PDF paths for batch conversion
  for (const { doc, documentResult } of loadResults) {
    if (documentResult.type === 'pdf' && documentResult.filePath) {
      if (!uniquePdfPaths.has(documentResult.filePath)) {
        uniquePdfPaths.add(documentResult.filePath);
        pdfDocuments.push({ doc, path: documentResult.filePath });
      }
    }
  }
  
  // Convert all PDFs in parallel
  if (pdfDocuments.length > 0) {
    console.log(`[AddSupportingDocumentsPage] 🔄 Converting ${pdfDocuments.length} unique PDFs via Ghostscript...`);
    const convertStartTime = Date.now();
    
    await Promise.all(
      pdfDocuments.map(async ({ path }) => {
        await convertPdfToImages(path, k.doc);
      })
    );
    
    console.log(`[AddSupportingDocumentsPage] ✅ PDF conversion completed in ${Date.now() - convertStartTime}ms`);
  }
  
  // Load all documents and extract pages - WITH DOCUMENT TYPE TRACKING
  interface PageInfo {
    docTitle: string;
    docSubtitle: string;
    docNumber: string;
    docDate: string;
    pageNumber: number;
    totalPages: number;
    embeddedPage: any;
    isImage: boolean;
    image?: any;
    documentType: string; // Track document type for grouping separators
    documentId: string; // NEW: Unique identifier for each document (path + number)
  }
  
  const allPages: PageInfo[] = [];
  
  // Process loaded results (conversions are now cached)
  for (const { doc, documentResult } of loadResults) {
    console.log(`[AddSupportingDocumentsPage] Processing: ${doc.title} (${doc.documentType})`);
    
    // Create unique document ID (combination of path and number)
    const documentId = `${doc.path}_${doc.number || Date.now()}`;
    
    // documentResult already loaded in parallel above
    if (documentResult.type === 'image' && documentResult.image) {
      // Single image - treat as 1 page
      allPages.push({
        docTitle: doc.title,
        docSubtitle: doc.subtitle || '',
        docNumber: doc.number || '',
        docDate: doc.date || '',
        pageNumber: 1,
        totalPages: 1,
        embeddedPage: null,
        isImage: true,
        image: documentResult.image,
        documentType: doc.documentType,
        documentId: documentId
      });
      console.log(`[AddSupportingDocumentsPage] ✅ ${doc.title} image loaded (1 page)`);
      
    } else if (documentResult.type === 'pdf' && documentResult.pdfPages) {
      // Multi-page PDF - use cached Ghostscript conversion
      const sourcePdf = documentResult.pdfPages;
      const pageCount = sourcePdf.getPageCount();
      const pdfFilePath = documentResult.filePath;
      console.log(`[AddSupportingDocumentsPage] ✅ ${doc.title} PDF (${pageCount} pages) - using cached conversion`);
      
        if (pdfFilePath) {
          const conversionResult = await convertPdfToImages(pdfFilePath, k.doc);
          
          if (conversionResult.success && conversionResult.images.length > 0) {
            console.log(`[AddSupportingDocumentsPage] ✅ Ghostscript converted ${conversionResult.images.length} pages from ${doc.title}`);
            
            conversionResult.images.forEach((image, index) => {
              allPages.push({
                docTitle: doc.title,
                docSubtitle: doc.subtitle || '',
                docNumber: doc.number || '',
                docDate: doc.date || '',
                pageNumber: index + 1,
                totalPages: conversionResult.images.length,
                embeddedPage: null,
                isImage: true,
                image: image,
                documentType: doc.documentType,
                documentId: documentId
              });
            });
          } else {
            console.error(`[AddSupportingDocumentsPage] ❌ Ghostscript failed for ${doc.title}: ${conversionResult.error}`);
            allPages.push({
              docTitle: doc.title,
              docSubtitle: `⚠️ Dokumen tidak dapat ditampilkan - ${conversionResult.error || 'conversion failed'}`,
              docNumber: doc.number || '',
              docDate: doc.date || '',
              pageNumber: 1,
              totalPages: 1,
              embeddedPage: null,
              isImage: false,
              documentType: doc.documentType,
              documentId: documentId
            });
          }
        } else {
          console.error(`[AddSupportingDocumentsPage] ❌ No file path for ${doc.title}`);
          allPages.push({
            docTitle: doc.title,
            docSubtitle: `⚠️ Dokumen tidak dapat ditampilkan (file path tidak tersedia)`,
            docNumber: doc.number || '',
            docDate: doc.date || '',
            pageNumber: 1,
            totalPages: 1,
            embeddedPage: null,
            isImage: false,
            documentType: doc.documentType,
            documentId: documentId
          });
        }
      } else if (documentResult.error) {
        console.warn(`[AddSupportingDocumentsPage] ⚠️ ${doc.title} failed to load: ${documentResult.error}`);
      }
  }
  
  console.log(`[AddSupportingDocumentsPage] Total pages to render: ${allPages.length}`);
  
  if (allPages.length === 0) {
    console.log('[AddSupportingDocumentsPage] No pages to render');
    return;
  }
  
  // Layout: 2 pages per output page, side by side - WITH DOCUMENT TYPE SEPARATORS
  const pagesPerOutputPage = 2;
  const pageWidthDual = 240;  // Width for each document page when showing 2 pages
  const pageWidthSingle = 360; // Width for single document page (larger)
  const pageHeightDual = 340; // Height for each document page when showing 2 pages
  const pageHeightSingle = 500; // Height for single document page (larger)
  const horizontalGap = 30;
  
  let currentPageIndex = 0;
  let lastDocumentType = ''; // Track last document type
  let lastDocumentSubtype = ''; // Track last document subtype for grouping
  let lastDocumentId = ''; // Track last document ID to separate individual documents
  
  while (currentPageIndex < allPages.length) {
    // Check if we need a document type/subtype separator
    const currentPage = allPages[currentPageIndex];
    if (!currentPage) break;
    
    const currentDocType = currentPage.documentType;
    const currentDocSubtype = currentPage.docSubtitle || '';
    const currentDocId = currentPage.documentId;
    
    // Need separator if type, subtype, OR document ID changed
    const needsSeparator = currentDocType !== lastDocumentType || 
                          currentDocSubtype !== lastDocumentSubtype ||
                          currentDocId !== lastDocumentId;
    
    // Update current document type for footer label BEFORE adding page
    if (needsSeparator) {
      k.currentDocumentType = currentDocType;
      lastDocumentType = currentDocType;
      lastDocumentSubtype = currentDocSubtype;
      lastDocumentId = currentDocId;
      console.log(`[AddSupportingDocumentsPage] Document changed to: ${currentDocType}${currentDocSubtype ? ' - ' + currentDocSubtype : ''} (ID: ${currentDocId})`);
    }
    
    // Add new output page (footer will use currentDocumentType)
    await k.addPage('documents');
    const { page } = k;
    const { width, height } = page.getSize();
    
    const startY = height - 140;
    
    // Calculate how many pages to render on this output page (max 2)
    // BUT: If document type, subtype, OR document ID changes mid-page, only render 1 to keep grouping clean
    let endIndex = Math.min(currentPageIndex + pagesPerOutputPage, allPages.length);
    
    // Check if next page has different document type, subtype, OR document ID - if so, only render current page
    if (endIndex > currentPageIndex + 1) {
      const nextPage = allPages[currentPageIndex + 1];
      if (nextPage && (nextPage.documentType !== currentDocType || 
                       (nextPage.docSubtitle || '') !== currentDocSubtype ||
                       nextPage.documentId !== currentDocId)) {
        endIndex = currentPageIndex + 1; // Only render current page
        console.log(`[AddSupportingDocumentsPage] Document change detected (type/subtype/ID), rendering only 1 page to keep grouping`);
      }
      
      // ADDITIONAL CHECK: If next page is pageNumber 1, it's a new document - start on new page
      if (nextPage && nextPage.pageNumber === 1 && nextPage.documentId !== currentDocId) {
        endIndex = currentPageIndex + 1; // Only render current page
        console.log(`[AddSupportingDocumentsPage] New document detected (pageNumber=1), starting on new output page`);
      }
    }
    
    const pagesToRender = endIndex - currentPageIndex;
    
    // Use larger size if only rendering 1 page
    const pageWidth = pagesToRender === 1 ? pageWidthSingle : pageWidthDual;
    const pageHeight = pagesToRender === 1 ? pageHeightSingle : pageHeightDual;
    
    // Calculate starting X to center the pages
    const totalWidth = (pageWidth * pagesToRender) + (horizontalGap * (pagesToRender - 1));
    const startX = (width - totalWidth) / 2;
    
    console.log(`[AddSupportingDocumentsPage] Rendering output page ${k.pageCount}, showing ${pagesToRender} document pages`);
    
    // Render pages for this output page
    for (let i = 0; i < pagesToRender; i++) {
      const pageInfo = allPages[currentPageIndex + i];
      if (!pageInfo) continue;
      
      const x = startX + (i * (pageWidth + horizontalGap));
      const y = startY;
      
      // Draw frame
      page.drawRectangle({
        x: x,
        y: y - pageHeight,
        width: pageWidth,
        height: pageHeight,
        borderColor: rgb(0.7, 0.7, 0.7),
        borderWidth: 1,
      });
      
      // Draw title and page number
      const titleY = y - 15;
      const titleText = pageInfo.totalPages > 1 
        ? `${pageInfo.docTitle} ${pageInfo.docSubtitle} (${pageInfo.pageNumber}/${pageInfo.totalPages})`
        : `${pageInfo.docTitle} ${pageInfo.docSubtitle}`.trim();
      
      k.text(titleText, x + 10, titleY, { bold: true, size: 10 });
      
      // Draw document number and date below title
      if (pageInfo.pageNumber === 1) { // Only show on first page
        const infoY = titleY - 12;
        const infoText = `No. ${pageInfo.docNumber} - ${pageInfo.docDate}`;
        k.text(infoText, x + 10, infoY, { bold: false, size: 8, color: rgb(0.4, 0.4, 0.4) });
      }
      
      // Calculate image/page area
      const contentStartY = pageInfo.pageNumber === 1 ? titleY - 25 : titleY - 10;
      const contentHeight = pageInfo.pageNumber === 1 ? pageHeight - 45 : pageHeight - 30;
      const contentWidth = pageWidth - 20;
      
      // Draw content (image or PDF page)
      try {
        if (pageInfo.isImage && pageInfo.image) {
          // Draw image
          const img = pageInfo.image;
          const imgDims = img.scale(1);
          const aspectRatio = imgDims.width / imgDims.height;
          
          let drawWidth = contentWidth;
          let drawHeight = contentHeight;
          
          if (aspectRatio > (contentWidth / contentHeight)) {
            drawHeight = drawWidth / aspectRatio;
          } else {
            drawWidth = drawHeight * aspectRatio;
          }
          
          const drawX = x + 10 + (contentWidth - drawWidth) / 2;
          const drawY = contentStartY - drawHeight;
          
          page.drawImage(img, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
          
        } else if (!pageInfo.isImage && pageInfo.embeddedPage) {
          // Draw PDF page
          const embeddedPage = pageInfo.embeddedPage;
          const pageDims = embeddedPage.scale(1);
          const aspectRatio = pageDims.width / pageDims.height;
          
          let drawWidth = contentWidth;
          let drawHeight = contentHeight;
          
          if (aspectRatio > (contentWidth / contentHeight)) {
            drawHeight = drawWidth / aspectRatio;
          } else {
            drawWidth = drawHeight * aspectRatio;
          }
          
          const drawX = x + 10 + (contentWidth - drawWidth) / 2;
          const drawY = contentStartY - drawHeight;
          
          page.drawPage(embeddedPage, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
        } else if (!pageInfo.isImage && !pageInfo.embeddedPage) {
          // Placeholder for documents that couldn't be embedded (e.g., mozjpeg compression error)
          // Draw a placeholder box with warning message
          const placeholderHeight = 100;
          const placeholderY = contentStartY - placeholderHeight - 50;
          
          // Draw border box
          page.drawRectangle({
            x: x + 20,
            y: placeholderY,
            width: contentWidth - 20,
            height: placeholderHeight,
            borderColor: rgb(0.8, 0.6, 0),
            borderWidth: 1,
            color: rgb(1, 0.98, 0.9), // Light yellow background
          });
          
          // Draw warning icon placeholder
          k.text('⚠️', x + 40, placeholderY + 70, { size: 24 });
          
          // Draw warning text
          k.text('Dokumen tidak dapat ditampilkan', x + 80, placeholderY + 70, { 
            size: 12, 
            bold: true,
            color: rgb(0.6, 0.4, 0)
          });
          
          k.text('Format file tidak kompatibel. Silakan upload ulang dokumen dengan format standar.', 
            x + 40, placeholderY + 45, { 
            size: 10,
            color: rgb(0.5, 0.5, 0.5)
          });
          
          if (pageInfo.docSubtitle && pageInfo.docSubtitle.includes('⚠️')) {
            k.text(pageInfo.docSubtitle.replace('⚠️ ', ''), x + 40, placeholderY + 25, { 
              size: 9,
              color: rgb(0.7, 0.3, 0)
            });
          }
        }
        
        console.log(`[AddSupportingDocumentsPage] ✅ Rendered page ${currentPageIndex + i + 1}/${allPages.length}`);
        
      } catch (error) {
        console.error(`[AddSupportingDocumentsPage] ❌ Error rendering page:`, error);
        const placeholderY = y - pageHeight / 2;
        k.text('Error memuat dokumen', x + 10, placeholderY, {
          size: 10,
          color: rgb(0.8, 0.2, 0.2),
        });
      }
    }
    
    currentPageIndex = endIndex;
  }
  
  console.log('[AddSupportingDocumentsPage] All documents pages completed');
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
      
      // For PDF documents, first convert to image via Ghostscript to avoid mozjpeg compression errors
      // The embedPages + drawPage approach fails during save() if the PDF contains mozjpeg-compressed images
      const pdfFilePath = documentResult.filePath;
      
      if (pdfFilePath) {
        console.log(`[DrawHSSEDocument] Converting PDF to image via Ghostscript...`);
        const conversionResult = await convertPdfToImages(pdfFilePath, doc);
        
        if (conversionResult.success && conversionResult.images.length > 0) {
          console.log(`[DrawHSSEDocument] ✅ Ghostscript converted PDF to ${conversionResult.images.length} image(s)`);
          
          // Use the first page image - safely extract with explicit check
          const firstImage = conversionResult.images[0];
          if (firstImage === undefined) {
            console.error(`[DrawHSSEDocument] ❌ Image at index 0 is undefined`);
            return;
          }
          const hsseImage = firstImage;
          const imgDims = hsseImage.scale(1);
          const imgAspectRatio = imgDims.width / imgDims.height;
          const frameAspectRatio = (itemWidth - 2) / (imageHeight - 2);
          
          let drawWidth = itemWidth - 2;
          let drawHeight = imageHeight - 2;
          let drawX = documentX + 1;
          let drawY = y - imageHeight + 1;
          
          if (imgAspectRatio > frameAspectRatio) {
            drawHeight = drawWidth / imgAspectRatio;
            drawY = y - (imageHeight + drawHeight) / 2;
          } else {
            drawWidth = drawHeight * imgAspectRatio;
            drawX = documentX + (itemWidth - drawWidth) / 2;
          }
          
          page.drawImage(hsseImage, {
            x: drawX,
            y: drawY,
            width: drawWidth,
            height: drawHeight,
          });
          
          console.log(`[DrawHSSEDocument] ✅ PDF (as image) drawn at (${drawX}, ${drawY}) with size ${drawWidth}x${drawHeight}`);
        } else {
          console.error(`[DrawHSSEDocument] ❌ Ghostscript conversion failed: ${conversionResult.error}`);
          
          // Draw simple placeholder text
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
        }
      } else {
        console.warn(`[DrawHSSEDocument] ⚠️ No file path for PDF: ${worker.worker_name}`);
        
        // Draw placeholder
        page.drawText("PDF", { 
          x: documentX + itemWidth/2 - 10, 
          y: y - imageHeight/2 + 15, 
          size: 10, 
          font: boldFont,
          color: rgb(0.2, 0.4, 0.8) 
        });
        page.drawText("Tersedia", { 
          x: documentX + itemWidth/2 - 18, 
          y: y - imageHeight/2 + 2, 
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
  const nameText = sanitizeForPDF(worker.worker_name);
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
    
    const hsseText = sanitizeForPDF(`${worker.hsse_pass_number} - ${fmtDateID(validThruDate)}`);
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
    const hsseText = sanitizeForPDF(worker.hsse_pass_number);
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
