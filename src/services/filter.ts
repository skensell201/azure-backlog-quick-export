import { CellValue, Table } from '../models/types';

export interface Filters {
  text: string;
  byHeader: Record<string, string>; // column header -> selected value ('' = all)
}

export const EMPTY_FILTERS: Filters = { text: '', byHeader: {} };

const FILTERABLE = ['Work Item Type', 'State', 'Value Area', 'Iteration Path', 'Tags', 'Assigned To'];

export interface FilterCol {
  header: string;
  index: number;
}

function cellText(c: unknown): string {
  return c === null || c === undefined ? '' : String(c);
}

function tagTokens(cell: string): string[] {
  return cell.split(/[;,]/).map((t) => t.trim()).filter(Boolean);
}

/** Filterable columns that are actually present in the table, with their column index. */
export function filterableColumns(table: Table): FilterCol[] {
  return FILTERABLE.map((header) => ({ header, index: table.headers.indexOf(header) })).filter((c) => c.index >= 0);
}

/** Sorted distinct values for a column (Tags are split into individual tokens). */
export function distinctValues(table: Table, col: FilterCol): string[] {
  const set = new Set<string>();
  for (const row of table.rows) {
    const raw = cellText(row[col.index]);
    if (col.header === 'Tags') tagTokens(raw).forEach((t) => set.add(t));
    else {
      const v = raw.trim();
      if (v) set.add(v);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** True if a single row (aligned to headers) passes the filters. */
export function matchesFilters(headers: string[], row: CellValue[], filters: Filters): boolean {
  const text = filters.text.trim().toLowerCase();
  if (text) {
    const anyCell = row.some((cell) => cellText(cell).toLowerCase().includes(text));
    if (!anyCell) return false;
  }
  for (const c of FILTERABLE) {
    const value = filters.byHeader[c];
    if (!value) continue;
    const idx = headers.indexOf(c);
    if (idx < 0) continue;
    const cell = cellText(row[idx]);
    if (c === 'Tags') {
      if (!tagTokens(cell).includes(value)) return false;
    } else if (cell !== value) {
      return false;
    }
  }
  return true;
}

/** Filters rows by free text (any cell) AND each active per-column selection. */
export function applyFilters(table: Table, filters: Filters): Table {
  return { ...table, rows: table.rows.filter((row) => matchesFilters(table.headers, row, filters)) };
}
