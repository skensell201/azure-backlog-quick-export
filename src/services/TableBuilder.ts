import { CellValue, Column, Rollups, Table } from '../models/types';
import { rollupKey } from './RollupService';

function fieldValue(raw: unknown): CellValue {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number' || typeof raw === 'string') return raw;
  if (typeof raw === 'boolean') return String(raw);
  if (typeof raw === 'object' && raw !== null && 'displayName' in (raw as Record<string, unknown>)) {
    const dn = (raw as Record<string, unknown>).displayName;
    return typeof dn === 'string' ? dn : String(dn);
  }
  return String(raw);
}

function cell(col: Column, id: number, fields: Map<number, Record<string, unknown>>, rollups: Rollups): CellValue {
  switch (col.kind) {
    case 'field':
      return fieldValue(fields.get(id)?.[col.referenceName]);
    case 'rollupSum':
      return rollups.sum.get(rollupKey(col.field, col.ofType))?.get(id) ?? null;
    case 'childCount':
      return (col.variant === 'all' ? rollups.countAll : rollups.countClosed).get(id) ?? 0;
    case 'parent':
      return rollups.parentTitle.get(id) ?? '';
    case 'hierarchyPath':
      return rollups.path.get(id) ?? '';
    case 'level':
      return rollups.level.get(id) ?? 0;
  }
}

export function buildRow(
  columns: Column[],
  id: number,
  fields: Map<number, Record<string, unknown>>,
  rollups: Rollups
): CellValue[] {
  return columns.map((c) => cell(c, id, fields, rollups));
}

interface Args {
  rowIds: number[];
  columns: Column[];
  fields: Map<number, Record<string, unknown>>;
  rollups: Rollups;
}

/** Assembles the final table: one row per rowId, one cell per column. */
export function buildTable({ rowIds, columns, fields, rollups }: Args): Table {
  return {
    columns,
    headers: columns.map((c) => c.header),
    rows: rowIds.map((id) => buildRow(columns, id, fields, rollups)),
  };
}
