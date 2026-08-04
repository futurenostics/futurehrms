/**
 * Report Service — turns a generic tabular dataset into a downloadable
 * CSV, Excel (.xlsx), or PDF. Any module (employees, commission runs,
 * …) builds a `ReportData` and picks a format; the rendering lives
 * here once so every export looks consistent.
 *
 * - CSV  → csv-stringify (already a dependency).
 * - XLSX → exceljs; a real Office Open XML workbook, header row bolded.
 * - PDF  → pdfkit; a landscape table with a title block, zebra rows,
 *          and automatic page breaks. Uses the built-in Helvetica
 *          font, so no font assets need to ship.
 */
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type ReportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportColumn {
  key: string;
  header: string;
  align?: 'left' | 'right';
  /** Relative weight for column width (defaults to 1). */
  weight?: number;
}

export interface ReportData {
  /** Sheet name / PDF heading. */
  title: string;
  /** Optional sub-line under the PDF title (e.g. filter summary). */
  subtitle?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, string | number | null | undefined>>;
  /** Stamped into the PDF footer + filename callers. */
  generatedAt: Date;
}

const MIME: Record<ReportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export function contentTypeFor(format: ReportFormat): string {
  return MIME[format];
}

export function extensionFor(format: ReportFormat): string {
  return format;
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

/** CSV — header row followed by one row per record. */
export function buildCsvReport(data: ReportData): Buffer {
  const header = data.columns.map((c) => c.header);
  const records = data.rows.map((r) => data.columns.map((c) => cell(r[c.key])));
  return Buffer.from(stringify([header, ...records]), 'utf-8');
}

/** XLSX — a single worksheet with a bold header row and sized columns. */
export async function buildXlsxReport(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.created = data.generatedAt;
  const ws = wb.addWorksheet(data.title.slice(0, 31) || 'Report');

  ws.columns = data.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.max(12, Math.min(48, (c.weight ?? 1) * 16)),
    style: { alignment: { horizontal: c.align ?? 'left' } },
  }));

  for (const row of data.rows) {
    const record: Record<string, string | number> = {};
    for (const c of data.columns) {
      const v = row[c.key];
      record[c.key] = v === null || v === undefined ? '' : v;
    }
    ws.addRow(record);
  }

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: 'middle' };

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

/**
 * Truncate a string to fit `maxWidth` at the doc's current font/size,
 * appending an ellipsis. Guarantees a single line — pdfkit's own
 * `ellipsis`/`lineBreak:false` options don't reliably clip, so we
 * measure and cut ourselves.
 */
function fitText(doc: PDFKit.PDFDocument, text: string, maxWidth: number): string {
  if (maxWidth <= 0 || text === '') return '';
  if (doc.widthOfString(text) <= maxWidth) return text;
  const ellipsis = '…';
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.widthOfString(text.slice(0, mid) + ellipsis) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo).trimEnd() + ellipsis;
}

/** PDF — landscape table with title, zebra striping, and page breaks. */
export function buildPdfReport(data: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const tableWidth = right - left;
    const totalWeight = data.columns.reduce((sum, c) => sum + (c.weight ?? 1), 0);
    const colX: number[] = [];
    const colW: number[] = [];
    let x = left;
    for (const c of data.columns) {
      const w = (tableWidth * (c.weight ?? 1)) / totalWeight;
      colX.push(x);
      colW.push(w);
      x += w;
    }

    // Title block.
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#14201e').text(data.title, left);
    if (data.subtitle) {
      doc.font('Helvetica').fontSize(9).fillColor('#5a6461').text(data.subtitle, left);
    }
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#8a938f')
      .text(`Generated ${data.generatedAt.toISOString().replace('T', ' ').slice(0, 16)} UTC`, left);
    doc.moveDown(0.8);

    const rowHeight = 18;
    const padX = 4;

    const drawHeader = (): void => {
      const y = doc.y;
      doc.rect(left, y, tableWidth, rowHeight).fill('#eef3f1');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#14201e');
      data.columns.forEach((c, i) => {
        const w = colW[i]! - padX * 2;
        doc.text(fitText(doc, c.header, w), colX[i]! + padX, y + 5, {
          width: w,
          align: c.align ?? 'left',
          lineBreak: false,
          height: rowHeight,
        });
      });
      doc.y = y + rowHeight;
    };

    const bottomLimit = doc.page.height - doc.page.margins.bottom;
    drawHeader();

    data.rows.forEach((row, idx) => {
      if (doc.y + rowHeight > bottomLimit) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (idx % 2 === 1) {
        doc.rect(left, y, tableWidth, rowHeight).fill('#f7f9f8');
      }
      doc.font('Helvetica').fontSize(8.5).fillColor('#26332f');
      data.columns.forEach((c, i) => {
        const w = colW[i]! - padX * 2;
        doc.text(fitText(doc, cell(row[c.key]), w), colX[i]! + padX, y + 5, {
          width: w,
          align: c.align ?? 'left',
          lineBreak: false,
          height: rowHeight,
        });
      });
      doc.y = y + rowHeight;
    });

    doc.end();
  });
}

/** Dispatch to the right renderer. */
export async function renderReport(data: ReportData, format: ReportFormat): Promise<Buffer> {
  switch (format) {
    case 'csv':
      return buildCsvReport(data);
    case 'xlsx':
      return buildXlsxReport(data);
    case 'pdf':
      return buildPdfReport(data);
  }
}
