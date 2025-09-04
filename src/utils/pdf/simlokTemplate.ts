// simlok-pdf.ts
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type RGB,
  type PDFImage,
} from "pdf-lib";

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

/** Struktur data mengikuti placeholder di template kamu */
export interface SubmissionPDFData {
  simlok_number?: string | null;
  simlok_date?: string | Date | null | undefined;
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
  // Tambahkan untuk daftar pekerja dari tabel terpisah
  workerList?: Array<{
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
  const jabatanSigner = s.signer_position || "[Jabatan Penandatangan]";
  const namaSigner = s.signer_name || "[Nama Penandatangan]";
  
  k.text(jabatanSigner, A4.w - 230, signatureY - 50);
  k.text(namaSigner, A4.w - 230, signatureY - 110, { bold: true });

  // Bottom section - Nama pekerja dari daftar pekerja terpisah
  const bottomY = signatureY - 140;

  // Right side - Worker names from WorkerList table
  if (s.workerList && s.workerList.length > 0) {
    k.text("Nama pekerja:", A4.w - 200, bottomY);
    s.workerList.forEach((pekerja, index) => {
      k.text(`${index + 1}. ${pekerja.worker_name}`, A4.w - 190, bottomY - 20 - (index * 15));
    });
  } else if (s.worker_names && s.worker_names.trim().length > 0) {
    // Fallback ke worker_names lama jika workerList kosong
    k.text("Nama pekerja:", A4.w - 200, bottomY);
    const workerNames = s.worker_names.split('\n').map(name => name.trim()).filter(name => name);
    workerNames.forEach((name, index) => {
      k.text(`${index + 1}. ${name}`, A4.w - 190, bottomY - 20 - (index * 15));
    });
  }

  return k.doc.save();
}
