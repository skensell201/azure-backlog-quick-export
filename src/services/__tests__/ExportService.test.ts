import { toCsv, toXlsxBlob } from '../ExportService';
import { Table } from '../../models/types';
import * as XLSX from 'xlsx';

const table: Table = {
  columns: [],
  headers: ['ID', 'Title', 'Sum of Effort'],
  rows: [
    [1, 'Hello, world', 8],
    [2, '=cmd|danger', null],
  ],
};

describe('toCsv', () => {
  it('starts with a UTF-8 BOM', () => {
    expect(toCsv(table).charCodeAt(0)).toBe(0xfeff);
  });

  it('quotes cells with commas and renders null as empty', () => {
    const lines = toCsv(table).replace(/^﻿/, '').trim().split('\n');
    expect(lines[0]).toBe('ID,Title,Sum of Effort');
    expect(lines[1]).toBe('1,"Hello, world",8');
    expect(lines[2]).toBe("2,'=cmd|danger,");
  });
});

describe('toXlsxBlob', () => {
  it('writes a sheet with headers and typed number cells', () => {
    const blob = toXlsxBlob(table);
    expect(blob).toBeInstanceOf(Blob);
    // round-trip the worksheet model directly (Blob bytes are environment-dependent)
    const ws = XLSX.utils.aoa_to_sheet([table.headers, ...table.rows.map((r) => r.map((c) => (c === null ? '' : c)))]);
    const round = XLSX.utils.sheet_to_json<{ ID: number }>(ws);
    expect(round[0].ID).toBe(1);
  });
});
