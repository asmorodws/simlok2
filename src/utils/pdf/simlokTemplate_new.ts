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
const LEFT_LABEL_WIDTH_DEFAULT = 190;
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
    this.text(left, this.x, this.y, { bold: true });

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

export async function generateSIMLOKPDF(
  s: SubmissionPDFData,
  opt: SIMLOKOptions = {}
): Promise<Uint8Array> {
  const k = new PDFKit();
  await k.init();
  k.fs = opt.fontSize ?? 12;
  k.lineGap = opt.lineGap ?? LINE_GAP_DEFAULT;
  k.leftLabelWidth = opt.leftLabelWidth ?? LEFT_LABEL_WIDTH_DEFAULT;

  // ===== Header with Pertamina logo on the right =====
  if (opt.logoBase64) {
    try {
      const bytes = Uint8Array.from(atob(opt.logoBase64), (c) =>
        c.charCodeAt(0)
      );
      const img =
        (await k.doc.embedPng(bytes).catch(() => null)) ||
        (await k.doc.embedJpg(bytes));
      const iw = 120; // larger logo
      const ratio = iw / img.width;
      const ih = img.height * ratio;
      // Position logo on the right side
      k.page.drawImage(img, {
        x: A4.w - MARGIN - iw,
        y: A4.h - MARGIN - ih,
        width: iw,
        height: ih,
      });
    } catch {
      // abaikan error logo
    }
  }

  // ===== Title centered =====
  k.center("SURAT IZIN MASUK LOKASI", A4.h - MARGIN - 25, {
    bold: true,
    size: 16,
    color: opt.primary ?? rgb(0, 0, 0),
  });
  
  // Nomor SIMLOK in parentheses, centered
  const simlokNo = s.nomor_simlok ? `${s.nomor_simlok}` : "";
  if (simlokNo) {
    k.center(simlokNo, A4.h - MARGIN - 43, { bold: true, size: 12 });
  }

  k.y = A4.h - MARGIN - 80;

  // ===== Opening text =====
  k.wrap(
    "Dengan ini di berikan izin memasuki lokasi PT PERTAMINA (PERSERO) kepada",
    k.x,
    A4.w - 2 * MARGIN
  );
  k.y -= 8;

  // ===== Numbered items 1-8 =====
  k.numberedRow(1, "Nama", `${s.nama_vendor}`, { valueBold: false });

  // 2. Berdasarkan
  const berdasarkan = s.nomor_simja
    ? `(${normalizeInline(s.nomor_simja)}) Tgl. (${fmtDateID(s.tanggal_simja)})`
    : "";
  k.numberedRow(2, "Berdasarkan", berdasarkan);

  k.numberedRow(3, "Pekerjaan", `(${s.pekerjaan})`);
  k.numberedRow(4, "Lokasi Kerja", `(${s.lokasi_kerja})`);
  k.numberedRow(5, "Pelaksanaan", `(${normalizeInline(s.pelaksanaan || "")})`);
  k.numberedRow(6, "Jam Kerja", `(${normalizeInline(s.jam_kerja)})`);
  k.numberedRow(7, "Lain-lain", `(${s.lain_lain || "lain_lain"})`);
  k.numberedRow(8, "Sarana Kerja", `(${s.sarana_kerja})`);

  k.y -= 10;

  // ===== Content section =====
  if (s.content && s.content.trim().length > 0) {
    k.wrap(`${normalizeInline(s.content)}`, k.x, A4.w - 2 * MARGIN);
    k.y -= 15;
  }

  // ===== Bottom text =====
  k.wrap(
    "Demikian agar dapat dipergunakan sebagaimana mestinya.",
    k.x,
    A4.w - 2 * MARGIN
  );
  k.y -= 25;

  // ===== Footer section - right aligned =====
  const city = opt.cityIssued ?? "Jakarta";
  const tglSimlok = fmtDateID(s.tanggal_simlok);
  
  // Calculate right alignment position
  const dateText = `Dikeluarkan di : ${city}`;
  const onDateText = `Pada tanggal : ${tglSimlok}`;
  const maxTextWidth = Math.max(
    k.measure(dateText),
    k.measure(onDateText)
  );
  const rightAlignX = A4.w - MARGIN - maxTextWidth;

  k.text(dateText, rightAlignX, k.y);
  k.y -= k.lineGap;
  k.text(onDateText, rightAlignX, k.y);
  k.y -= 30;

  // ===== Signature section - right aligned =====
  const headTitle = opt.headTitle ?? "Head Of Security Region I";
  const headName = opt.headName ?? "Juliarto Santoso";

  const titleWidth = k.measure(headTitle, { bold: true });
  const nameWidth = k.measure(headName, { bold: true });
  const sigRightX = A4.w - MARGIN - Math.max(titleWidth, nameWidth);

  k.text(headTitle, sigRightX, k.y, { bold: true });
  k.y -= k.lineGap * 4; // space for signature
  k.text(headName, sigRightX, k.y, { bold: true });

  // ===== Left side - Tembusan section =====
  k.y = k.y + (k.lineGap * 2); // adjust position
  const tembusan = asList(s.tembusan);
  if (tembusan.length) {
    k.text(`${s.nama_vendor}`, MARGIN, k.y, { bold: true });
    k.y -= k.lineGap;
    k.text("Tg.", MARGIN, k.y);
    k.y -= k.lineGap;
    k.text("Tembusan", MARGIN, k.y);
    k.y -= k.lineGap * 1.5;
    
    tembusan.forEach((t, i) => {
      k.text(`${t}`, MARGIN + 20, k.y);
      k.y -= k.lineGap;
    });
    
    k.text(`(nama pekerja)`, MARGIN + 20, k.y);
  } else {
    // Default tembusan if none provided
    k.text("(nama vendor)", MARGIN, k.y, { bold: true });
    k.y -= k.lineGap;
    k.text("Tg.", MARGIN, k.y);
    k.y -= k.lineGap;
    k.text("Tembusan", MARGIN, k.y);
    k.y -= k.lineGap * 1.5;
    k.text("(nama petugas)", MARGIN + 20, k.y);
    k.y -= k.lineGap;
    k.text("(nama pekerja)", MARGIN + 20, k.y);
  }

  return await k.doc.save();
}
