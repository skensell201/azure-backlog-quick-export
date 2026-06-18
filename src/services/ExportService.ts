import * as XLSX from 'xlsx';
import { CellValue, Table } from '../models/types';

const BOM = '﻿';

/** Excel treats cells starting with = + - @ as formulas even in CSV; prefix with ' to force text. */
function deFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function cellToString(c: CellValue): string {
  return c === null ? '' : String(c);
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(table: Table): string {
  const header = table.headers.map((h) => csvCell(deFormula(h))).join(',');
  const body = table.rows.map((row) => row.map((c) => csvCell(deFormula(cellToString(c)))).join(','));
  return BOM + [header, ...body].join('\n') + '\n';
}

export function toXlsxBlob(table: Table): Blob {
  const aoa: CellValue[][] = [table.headers, ...table.rows.map((row) => row.map((c) => (c === null ? '' : c)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Work Items');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
