// simlok-pdf.ts
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type RGB,
} from "pdf-lib";

/** Struktur data mengikuti placeholder di template kamu */
export interface SubmissionPDFData {
  nomor_simlok?: string | null;
  tanggal_simlok?: string | Date | null | undefined;
  nama_vendor: string;
  nomor_simja?: string | null;
  tanggal_simja?: string | Date | null | undefined;
  nomor_sika?: string | null;
  tanggal_sika?: string | Date | null | undefined;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  jam_kerja: string;            // contoh: "08:30 - 06:30 WIB"
  lain_lain?: string | null;
  sarana_kerja: string;
  nama_pekerja?: string | null;
  tembusan?: string | null;
  content?: string | null;
  jabatan_signer?: string | null;
  nama_signer?: string | null;
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
  
  const monthIndex = monthMap[month.toLowerCase()];
  if (monthIndex === undefined) return null;
  
  return new Date(parseInt(year), monthIndex, parseInt(day));
}

/** Hapus newline ganda & spasi berlebih agar wrap presisi */
function normalizeInline(s?: string | null) {
  if (!s) return "";
  return s.replace(/\s+/g, " ").trim();
}
function asList(value?: string | null) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
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
      this.text(ln, x, this.y, { size, bold: o?.bold });
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
  let logoImage = null;
  try {
    // In Node.js environment, we need to use the file system or a full URL
    const logoPath = '/media/asmorodwi/DATA/apaaja/penting/tmp/simlok2/src/utils/pdf/logo_pertamina.png';
    const fs = require('fs');
    const logoBytes = fs.readFileSync(logoPath);
    logoImage = await k.doc.embedPng(logoBytes);
  } catch (error) {
    console.warn('Failed to load logo:', error);
    // Continue without logo
  }

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
  const simlokNo = s.nomor_simlok ? `${s.nomor_simlok}` : "";
  k.center(`SIMLOK NO-${simlokNo}`, height - 120, {
    size: 14,
  });

  // Introduction text
  k.text("Dengan ini di berikan izin memasuki lokasi PT PERTAMINA (PERSERO) kepada", 50, height - 160, {
    size: 12,
  });

  // Move to content area and add numbered items
  k.y = height - 190;

  k.numberedRow(1, "Nama", s.nama_vendor, { valueBold: false });

  // Format berdasarkan (SIMJA info)
  const berdasarkan = s.nomor_simja
    ? `${normalizeInline(s.nomor_simja)} Tgl. ${fmtDateID(s.tanggal_simja)}`
    : "";
  
  k.numberedRow(2, "Berdasarkan", berdasarkan);
  k.numberedRow(3, "Pekerjaan", s.pekerjaan);
  k.numberedRow(4, "Lokasi Kerja", s.lokasi_kerja);
  k.numberedRow(5, "Pelaksanaan", normalizeInline(s.pelaksanaan || ""));
  k.numberedRow(6, "Jam Kerja", `Mulai pukul`);
  
  // Special handling for "Lain-lain" to show as bulleted list
  if (s.lain_lain && s.lain_lain.trim().length > 0) {
    k.pageBreak();
    
    // Label kiri (bold)
    const left = "7. Lain-lain";
    k.text(left, k.x, k.y, { bold: false });

    // Titik dua di kolom tengah
    const colonX = k.x + k.leftLabelWidth - k.measure(":", { size: k.fs }) - 2;
    k.text(":", colonX, k.y);

    // Process lain-lain as bulleted list
   const lines = s.lain_lain.split('\n').map(l => l.trim()).filter(Boolean);
const rightX = k.x + k.leftLabelWidth + 4;
const rightW = A4.w - MARGIN - rightX;

lines.forEach((line, idx) => {
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
  
  k.numberedRow(8, "Sarana Kerja", s.sarana_kerja);

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
  const dateFromPelaksanaan = extractDateFromPelaksanaan(s.pelaksanaan);
  const displayDate = dateFromPelaksanaan || toDate(s.tanggal_simlok);

  // Right side - Location and Date (above Head title)
  k.text("Dikeluarkan di : Jakarta", A4.w - 230, signatureY);
  k.text("Pada tanggal : " + fmtDateID(displayDate), A4.w - 230, signatureY - 20);

  // Right side - Head title and name (below location/date)
  const jabatanSigner = s.jabatan_signer || "[Jabatan Penandatangan]";
  const namaSigner = s.nama_signer || "[Nama Penandatangan]";
  
  k.text(jabatanSigner, A4.w - 230, signatureY - 50);
  k.text(namaSigner, A4.w - 230, signatureY - 110, { bold: true });

  // Bottom section - Tembusan on left, Nama pekerja on right (aligned)
  const bottomY = signatureY - 140;

  // Left side - Tembusan
  if (s.tembusan && s.tembusan.trim().length > 0) {
    const tembusanLines = s.tembusan.split('\n').map(line => line.trim()).filter(line => line);
    k.text("Tembusan:", 50, bottomY);
    tembusanLines.forEach((line, index) => {
      k.text(`${index + 1} ${line}`, 50, bottomY - 20 - (index * 15));
    });
  }

  // Right side - Worker names (aligned with tembusan)
  if (s.nama_pekerja && s.nama_pekerja.trim().length > 0) {
    k.text("Nama pekerja:", A4.w - 200, bottomY);
    const workerNames = s.nama_pekerja.split('\n').map(name => name.trim()).filter(name => name);
    workerNames.forEach((name, index) => {
      k.text(`${index + 1} ${name}`, A4.w - 190, bottomY - 20 - (index * 15));
    });
  }

  return k.doc.save();
}
