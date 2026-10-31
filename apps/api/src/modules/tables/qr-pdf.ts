import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import type { TableQrLayout } from 'shared';

// Warna brand (docs/design/BRAND.md); di PDF tidak ada token Tailwind sehingga hex dipakai langsung.
const BRAND = { primary: '#106f4d', cream: '#ffffca', ink: '#1f2a24', muted: '#5b6b62', white: '#ffffff' };

/** A6 dalam point PDF (105 × 148 mm). Empat kartu A6 = satu lembar A4. */
const CARD = { width: 297.64, height: 419.53 };
const A4 = { width: CARD.width * 2, height: CARD.height * 2 };
const QR_SIZE = 180;

export interface QrTable {
  label: string;
  qrToken: string;
}

export interface QrPdfInput {
  outletName: string;
  outletSlug: string;
  /** Alamat web publik, mis. https://matwona.id (tanpa garis miring di akhir). */
  webBaseUrl: string;
  layout: TableQrLayout;
  tables: QrTable[];
}

/** URL yang dikodekan di QR meja (PRD 2.2.1): <web>/m/<outlet>/t/<token>. */
export function tableQrUrl(webBaseUrl: string, outletSlug: string, token: string): string {
  return `${webBaseUrl.replace(/\/+$/, '')}/m/${encodeURIComponent(outletSlug)}/t/${token}`;
}

/** Satu kartu QR meja berdesain brand pada posisi (x, y) halaman. */
function drawCard(doc: PDFKit.PDFDocument, x: number, y: number, label: string, qrPng: Buffer, outletName: string) {
  const { width, height } = CARD;
  doc.rect(x, y, width, height).fill(BRAND.cream);

  // Pita atas: nama brand (logo SVG resmi belum tersedia, lihat docs/design/BRAND.md).
  doc.rect(x, y, width, 72).fill(BRAND.primary);
  doc.fillColor(BRAND.white).font('Helvetica-Bold').fontSize(26).text('Matwona', x, y + 16, { width, align: 'center' });
  doc.fillColor(BRAND.cream).font('Helvetica').fontSize(9).text('Two worlds. One table. Simply, makan.', x, y + 48, { width, align: 'center' });

  // Label meja sampai 20 karakter: kecilkan font agar selalu satu baris dan tidak menimpa QR.
  const title = `Meja ${label}`;
  let size = 30;
  doc.font('Helvetica-Bold');
  while (size > 14 && doc.fontSize(size).widthOfString(title) > width - 24) size -= 2;
  doc.fillColor(BRAND.ink).fontSize(size).text(title, x, y + 86 + (30 - size) / 2, { width, align: 'center', lineBreak: false });

  const qrX = x + (width - QR_SIZE) / 2;
  const qrY = y + 132;
  doc.roundedRect(qrX - 10, qrY - 10, QR_SIZE + 20, QR_SIZE + 20, 12).fill(BRAND.white);
  doc.image(qrPng, qrX, qrY, { width: QR_SIZE, height: QR_SIZE });

  doc.fillColor(BRAND.primary).font('Helvetica-Bold').fontSize(17).text('Scan untuk pesan', x, y + 336, { width, align: 'center' });
  doc.fillColor(BRAND.muted).font('Helvetica').fontSize(9).text('Pilih menu  ·  Kirim pesanan  ·  Bayar di kasir', x, y + 360, { width, align: 'center' });
  doc.fillColor(BRAND.muted).fontSize(8).text(outletName, x, y + height - 24, { width, align: 'center' });
}

/** Garis potong putus-putus di antara kartu pada layout grid A4. */
function drawCutLines(doc: PDFKit.PDFDocument) {
  doc.save().dash(4, { space: 4 }).lineWidth(0.5).strokeColor(BRAND.muted);
  doc.moveTo(CARD.width, 0).lineTo(CARD.width, A4.height).stroke();
  doc.moveTo(0, CARD.height).lineTo(A4.width, CARD.height).stroke();
  doc.restore();
}

/**
 * PDF QR meja siap cetak (FR-011, PRD 2.2.8): logo/nama Matwona, nomor meja, instruksi "Scan untuk pesan",
 * warna brand. Layout `a6` = satu kartu per halaman; `a4grid` = empat kartu per halaman A4.
 */
export async function renderTablesQrPdf(input: QrPdfInput): Promise<Buffer> {
  const pngs = await Promise.all(
    input.tables.map((t) =>
      QRCode.toBuffer(tableQrUrl(input.webBaseUrl, input.outletSlug, t.qrToken), {
        type: 'png',
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 600,
        color: { dark: BRAND.ink, light: BRAND.white },
      }),
    ),
  );

  const grid = input.layout === 'a4grid';
  const doc = new PDFDocument({
    size: grid ? [A4.width, A4.height] : [CARD.width, CARD.height],
    margin: 0,
    autoFirstPage: false,
    info: { Title: `QR meja ${input.outletName}`, Author: 'Matwona Smart Order' },
  });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  input.tables.forEach((table, i) => {
    const slot = grid ? i % 4 : 0;
    if (slot === 0) {
      doc.addPage();
      if (grid) drawCutLines(doc);
    }
    const x = grid ? (slot % 2) * CARD.width : 0;
    const y = grid ? Math.floor(slot / 2) * CARD.height : 0;
    drawCard(doc, x, y, table.label, pngs[i]!, input.outletName);
  });

  doc.end();
  return done;
}
