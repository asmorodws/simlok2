import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export interface SubmissionPDFData {
  id: string;
  status_approval_admin: string;
  nama_vendor: string;
  berdasarkan: string;
  nama_petugas: string;
  pekerjaan: string;
  lokasi_kerja: string;
  pelaksanaan: string | null;
  jam_kerja: string;
  lain_lain?: string | null;
  sarana_kerja: string;
  tembusan?: string | null;
  nomor_simja?: string | null;
  tanggal_simja?: string | Date | null | undefined;
  nomor_sika?: string | null;
  tanggal_sika?: string | Date | null | undefined;
  nomor_simlok?: string | null;
  tanggal_simlok?: string | Date | null | undefined;
  nama_pekerja: string;
  content: string | null;
  keterangan?: string | null;
  user: {
    id: string;
    nama_petugas: string;
    email: string;
    nama_vendor: string;
  };
  approvedByUser?: {
    id: string;
    nama_petugas: string;
    email: string;
  } | null;
}

export class SIMLOKPDFTemplate {
  private pdfDoc!: PDFDocument;
  private page!: any;
  private font!: any;
  private boldFont!: any;
  private width!: number;
  private height!: number;
  private margin = 50;
  private currentY!: number;

  async initialize() {
    this.pdfDoc = await PDFDocument.create();
    this.page = this.pdfDoc.addPage([595.28, 841.89]); // A4 size
    this.font = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
    this.boldFont = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { width, height } = this.page.getSize();
    this.width = width;
    this.height = height;
    this.currentY = height - this.margin;
  }

  private addText(text: string, x: number, y: number, options: any = {}) {
    this.page.drawText(text, {
      x,
      y,
      size: options.size || 12,
      font: options.bold ? this.boldFont : this.font,
      color: rgb(0, 0, 0),
      ...options,
    });
  }

  private formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '-';
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  private addSection(title: string, content: () => void, spacing: number = 20) {
    this.addText(title, this.margin, this.currentY, { bold: true });
    this.currentY -= spacing;
    content();
    this.currentY -= 15; // Extra spacing after section
  }

  private addSimpleField(label: string, value: string | null | undefined) {
    if (value) {
      this.addText(`${label}: ${value}`, this.margin, this.currentY);
      this.currentY -= 15;
    }
  }

  private addMultiLineField(label: string, value: string | null | undefined) {
    if (value) {
      this.addText(`${label}:`, this.margin, this.currentY, { bold: true });
      this.currentY -= 15;
      
      const lines = value.split('\n');
      lines.forEach((line: string) => {
        this.addText(line, this.margin, this.currentY);
        this.currentY -= 15;
      });
    }
  }

  private addListField(label: string, value: string | null | undefined) {
    if (value) {
      this.addText(`${label}:`, this.margin, this.currentY, { bold: true });
      this.currentY -= 15;
      
      const list = value
        .split(/[\n,]+/)
        .map((item: string) => item.trim())
        .filter((item: string) => item.length > 0);
      
      list.forEach((item: string, index: number) => {
        this.addText(`${index + 1}. ${item}`, this.margin + 20, this.currentY);
        this.currentY -= 15;
      });
    }
  }

  private addWrappedText(content: string, maxWidth: number = 495) {
    const words = content.split(' ');
    let line = '';

    words.forEach((word: string) => {
      const testLine = line + (line ? ' ' : '') + word;
      const textWidth = this.font.widthOfTextAtSize(testLine, 12);
      
      if (textWidth > maxWidth && line) {
        this.addText(line, this.margin, this.currentY);
        this.currentY -= 15;
        line = word;
      } else {
        line = testLine;
      }
    });
    
    if (line) {
      this.addText(line, this.margin, this.currentY);
      this.currentY -= 15;
    }
  }

  public async generateSIMLOKPDF(submission: SubmissionPDFData): Promise<Uint8Array> {
    await this.initialize();

    // Header
    this.addText('SURAT IZIN MASUK LOKASI (SIMLOK)', this.width / 2 - 120, this.currentY, { 
      bold: true, 
      size: 16 
    });
    this.currentY -= 30;

    // SIMLOK Number and Date
    this.addText(`Nomor: ${submission.nomor_simlok}`, this.margin, this.currentY, { bold: true });
    this.currentY -= 20;
    this.addText(`Tanggal: ${this.formatDate(submission.tanggal_simlok)}`, this.margin, this.currentY);
    this.currentY -= 40;

    // Vendor Information Section
    this.addSection('INFORMASI VENDOR', () => {
      this.addSimpleField('Nama Vendor', submission.nama_vendor);
      this.addSimpleField('Nama Petugas', submission.nama_petugas);
      this.addSimpleField('Email', submission.user.email);
      this.addSimpleField('Berdasarkan', submission.berdasarkan);
    }, 20);

    this.currentY -= 15;

    // Work Details Section
    this.addSection('DETAIL PEKERJAAN', () => {
      this.addSimpleField('Pekerjaan', submission.pekerjaan);
      this.addSimpleField('Lokasi Kerja', submission.lokasi_kerja);
      this.addSimpleField('Jam Kerja', submission.jam_kerja);
      this.addListField('Nama Pekerja', submission.nama_pekerja);
      this.addSimpleField('Sarana Kerja', submission.sarana_kerja);
    }, 20);

    this.currentY -= 15;

    // Pelaksanaan Section
    if (submission.pelaksanaan) {
      this.addSection('PELAKSANAAN', () => {
        this.addMultiLineField('', submission.pelaksanaan);
      }, 15);
    }

    // Content Section
    if (submission.content) {
      this.addSection('DESKRIPSI PEKERJAAN', () => {
        this.addWrappedText(submission.content!);
      }, 15);
      
      this.currentY -= 15;
    }

    // Lain-lain Section
    if (submission.lain_lain) {
      this.addSection('LAIN-LAIN', () => {
        this.addMultiLineField('', submission.lain_lain);
      }, 15);
    }

    // Document Information Section
    this.addSection('INFORMASI DOKUMEN', () => {
      if (submission.nomor_simja) {
        this.addSimpleField('SIMJA', `${submission.nomor_simja} - ${this.formatDate(submission.tanggal_simja)}`);
      }
      
      if (submission.nomor_sika) {
        this.addSimpleField('SIKA', `${submission.nomor_sika} - ${this.formatDate(submission.tanggal_sika)}`);
      }
    }, 20);

    this.currentY -= 15;

    // Approval Information Section
    this.addSection('INFORMASI PERSETUJUAN', () => {
      this.addSimpleField('Status', submission.status_approval_admin);
      
      if (submission.approvedByUser) {
        this.addSimpleField('Disetujui oleh', submission.approvedByUser.nama_petugas);
      }
      
      if (submission.keterangan) {
        this.addSimpleField('Keterangan', submission.keterangan);
      }
    }, 20);

    // Tembusan Section
    if (submission.tembusan) {
      this.addSection('TEMBUSAN', () => {
        this.addListField('', submission.tembusan);
      }, 15);
    }

    // Generate and return PDF bytes
    return await this.pdfDoc.save();
  }
}

// Factory function for easy usage
export async function generateSIMLOKPDF(submission: SubmissionPDFData): Promise<Uint8Array> {
  const template = new SIMLOKPDFTemplate();
  return await template.generateSIMLOKPDF(submission);
}
