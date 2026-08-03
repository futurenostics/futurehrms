import { describe, it, expect } from 'vitest';
import {
  buildCsvReport,
  buildXlsxReport,
  buildPdfReport,
  renderReport,
  contentTypeFor,
  extensionFor,
  type ReportData,
} from './report-formats';

const SAMPLE: ReportData = {
  title: 'Employees',
  subtitle: '2 employees',
  generatedAt: new Date('2026-08-03T09:00:00Z'),
  columns: [
    { key: 'eid', header: 'EID', weight: 1 },
    { key: 'fullName', header: 'Name', weight: 2 },
    { key: 'salaryPkr', header: 'Salary (PKR)', weight: 1, align: 'right' },
  ],
  rows: [
    { eid: 'EMP-0001', fullName: 'Maryam Iqbal', salaryPkr: 120000 },
    { eid: 'EMP-0002', fullName: 'Sana, Akram', salaryPkr: null },
  ],
};

describe('report-formats', () => {
  it('CSV: header + rows, commas inside a field are quoted', () => {
    const csv = buildCsvReport(SAMPLE).toString('utf-8');
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe('EID,Name,Salary (PKR)');
    expect(lines[1]).toContain('EMP-0001,Maryam Iqbal,120000');
    // The comma in "Sana, Akram" must be quoted, null salary → empty.
    expect(lines[2]).toContain('"Sana, Akram"');
    expect(lines[2]!.endsWith(',')).toBe(true);
  });

  it('XLSX: produces a real Office Open XML workbook (zip magic PK)', async () => {
    const buf = await buildXlsxReport(SAMPLE);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('PDF: produces a real PDF (magic %PDF, EOF marker)', async () => {
    const buf = await buildPdfReport(SAMPLE);
    expect(buf.length).toBeGreaterThan(0);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.toString('latin1')).toContain('%%EOF');
  });

  it('renderReport dispatches by format and reports matching mime/extension', async () => {
    expect((await renderReport(SAMPLE, 'csv')).subarray(0, 3).toString('latin1')).toBe('EID');
    expect((await renderReport(SAMPLE, 'xlsx')).subarray(0, 2).toString('latin1')).toBe('PK');
    expect((await renderReport(SAMPLE, 'pdf')).subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(contentTypeFor('xlsx')).toContain('spreadsheetml');
    expect(contentTypeFor('pdf')).toBe('application/pdf');
    expect(extensionFor('csv')).toBe('csv');
  });

  it('PDF paginates a large dataset without throwing', async () => {
    const big: ReportData = {
      ...SAMPLE,
      rows: Array.from({ length: 200 }, (_, i) => ({
        eid: `EMP-${String(i).padStart(4, '0')}`,
        fullName: `Person Number ${i} With A Fairly Long Name To Test Truncation`,
        salaryPkr: 50000 + i,
      })),
    };
    const buf = await buildPdfReport(big);
    expect(buf.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buf.length).toBeGreaterThan(2000);
  });
});
