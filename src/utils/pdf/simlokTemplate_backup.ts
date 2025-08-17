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

  hr(gap = 10) {
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: A4.w - MARGIN, y: this.y },
      thickness: 0.6,
      color: rgb(0.82, 0.82, 0.82),
    });
    this.y -= gap;
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

  // ===== Header =====
  // Logo (opsional)
  if (opt.logoBase64) {
    try {
      const bytes = Uint8Array.from(atob(opt.logoBase64), (c) =>
        c.charCodeAt(0)
      );
      const img =
        (await k.doc.embedPng(bytes).catch(() => null)) ||
        (await k.doc.embedJpg(bytes));
      const iw = 90;
      const ratio = iw / img.width;
      const ih = img.height * ratio;
      k.page.drawImage(img, {
        x: MARGIN,
        y: A4.h - MARGIN - ih,
        width: iw,
        height: ih,
      });
    } catch {
      // abaikan error logo
    }
  }

  // Judul + nomor (centered by measure)
  k.center("SURAT IZIN MASUK LOKASI", A4.h - MARGIN - 10, {
    bold: true,
    size: 16,
    color: opt.primary ?? rgb(0, 0, 0),
  });
  const simlokTitle = s.nomor_simlok
    ? `SIMLOK NO - ${s.nomor_simlok}`
    : "SIMLOK";
  k.center(simlokTitle, A4.h - MARGIN - 28, { bold: true });

  k.y = A4.h - MARGIN - 60;
  k.hr(12);

  // Pembuka (rapikan spasi)
  k.wrap(
    "Dengan ini di berikan izin memasuki lokasi PT PERTAMINA (PERSERO) kepada",
    k.x,
    A4.w - 2 * MARGIN
  );

  // ===== 1..8 =====
  k.numberedRow(1, "Nama", s.nama_vendor, { valueBold: true });

  // 2. Berdasarkan (pola: no_simja Tgl. tgl_simja)
  const berdasarkan = s.nomor_simja
    ? `${normalizeInline(s.nomor_simja)} Tgl. ${fmtDateID(s.tanggal_simja)}`
    : "";
  k.numberedRow(2, "Berdasarkan", berdasarkan);

  k.numberedRow(3, "Pekerjaan", s.pekerjaan);
  k.numberedRow(4, "Lokasi Kerja", s.lokasi_kerja);

  // 5. Pelaksanaan → normalize newline agar tidak terbelah aneh
  k.numberedRow(5, "Pelaksanaan", normalizeInline(s.pelaksanaan || ""));

  // 6. Jam Kerja → tambah “Mulai pukul” seperti template contoh
  k.numberedRow(6, "Jam Kerja", `Mulai pukul ${normalizeInline(s.jam_kerja)}`);

  // 7. Lain-lain → gabungkan “Izin diberikan berdasarkan: …” jika ada data SIMJA/SIKA
  const simjaRef = s.nomor_simja
    ? `Simja Ast. Man. Facility Management\n${s.nomor_simja} Tgl. ${fmtDateID(
        s.tanggal_simja
      )}`
    : "";
  const sikaRef = s.nomor_sika
    ? `SIKA Pekerjaan Dinas\n${s.nomor_sika} Tgl. ${fmtDateID(s.tanggal_sika)}`
    : "";
  const refs = [simjaRef, sikaRef].filter(Boolean).join("\n\n");

  let lainLain = (s.lain_lain ?? "").trim();
  if (refs) {
    const header = "Izin diberikan berdasarkan:";
    // tetap pertahankan newline yang diinginkan, tapi bersihkan spasi ganda
    const left = lainLain ? `${lainLain}\n\n` : "";
    lainLain = `${left}${header}\n${refs}`;
  }
  k.numberedRow(7, "Lain-lain", lainLain);

  // 8. Sarana Kerja
  k.numberedRow(8, "Sarana Kerja", s.sarana_kerja);

  k.hr(12);

  // ===== Nama pekerja =====
  const pekerja = asList(s.nama_pekerja);
  if (pekerja.length) {
    k.text("Nama pekerja", k.x, k.y, { bold: true });
    k.y -= k.lineGap;
    pekerja.forEach((p, i) =>
      k.wrap(`${i + 1}. ${p}`, k.x, A4.w - 2 * MARGIN)
    );
    k.y -= 6;
  }

  // ===== Tembusan =====
  const tembusan = asList(s.tembusan);
  if (tembusan.length) {
    k.text("Tembusan", k.x, k.y, { bold: true });
    k.y -= k.lineGap;
    tembusan.forEach((t, i) =>
      k.wrap(`${i + 1}. ${t}`, k.x, A4.w - 2 * MARGIN)
    );
    k.y -= 6;
  }

  // ===== Content / Penutup (hanya sekali, tidak ada duplikasi ketentuan) =====
  if (s.content && s.content.trim().length > 0) {
    k.wrap(normalizeInline(s.content), k.x, A4.w - 2 * MARGIN);
    k.y -= 8;
  }

  // ===== Ketentuan (1 paragraf saja) =====
  k.wrap(
    "Surat izin masuk lokasi ini diberikan dengan ketentuan agar mematuhi semua peraturan tentang Keamanan dan Keselamatan Kerja dan ketertiban, apabila pihak ke-III/rekanan melakukan tindakan pelanggaran yang menimbulkan kerugian PT. Pertamina (Persero) maka kerugian tersebut menjadi tanggung jawab pihak ke-III/rekanan. Lakukan perpanjangan Simlok 2 hari sebelum masa berlaku habis.",
    k.x,
    A4.w - 2 * MARGIN
  );

  k.y -= 12;

  // ===== Footer: Dikeluarkan / Pada tanggal =====
  const city = opt.cityIssued ?? "Jakarta";
  const tglSimlok = fmtDateID(s.tanggal_simlok);

  k.wrap(`Dikeluarkan di : ${city}`, k.x, 260);
  k.wrap(`Pada tanggal : ${tglSimlok}`, k.x, 260);
  k.y -= 10;

  // ===== TTD kanan (right aligned ke margin kanan) =====
  const headTitle = opt.headTitle ?? "Head of Security Region I";
  const headName = opt.headName ?? "Juliarto Santoso";

  // hitung posisi kanan dengan lebar teks agar rata kanan
  const titleW = k.measure(headTitle, { bold: true });
  const nameW = k.measure(headName, { bold: true });
  const rightBaseX = A4.w - MARGIN - Math.max(titleW, nameW);

  const yStart = k.y;
  k.text(headTitle, rightBaseX, k.y, { bold: true });
  k.y -= k.lineGap * 3; // ruang tanda tangan
  k.text(headName, rightBaseX, k.y, { bold: true });
  k.y = yStart;

  // ===== Alamat bawah (opsional garis) =====
  k.y = MARGIN + 30;
  k.page.drawLine({
    start: { x: MARGIN, y: k.y },
    end: { x: A4.w - MARGIN, y: k.y },
    thickness: 0.6,
    color: rgb(0.85, 0.85, 0.85),
  });
  k.y -= 14;
  k.text(
    "Gedung Grha Pertamina • Jl. Medan Merdeka Timur No. 11–13 Jakarta Pusat",
    MARGIN,
    k.y,
    { size: 9 }
  );

  return await k.doc.save();
}
