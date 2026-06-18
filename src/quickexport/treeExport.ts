import { CellValue, NamedRef, Table, TreeRelations, TreeTable } from '../models/types';
import { neededFields, parentChild, sumSpecsOf } from '../services/rollupPlanning';
import { computeRollups } from '../services/RollupService';
import { buildTree } from '../services/TreeBuilder';
import { toCsv, toXlsxBlob } from '../services/ExportService';
import { treeExportColumns } from './treeColumns';

/** One indent step prepended to the Title per depth level, so nesting is visible in the file. */
export const INDENT = '    ';

export interface TreeExportDeps {
  backlog: {
    getBacklogLevels(project: string, team: string): Promise<NamedRef[]>;
    getBacklogWorkItemIds(project: string, team: string, backlogId: string): Promise<number[]>;
  };
  workItems: {
    getDescendants(project: string, rootIds: number[]): Promise<TreeRelations>;
    getFieldsBatch(project: string, ids: number[], fields: string[]): Promise<Map<number, Record<string, unknown>>>;
  };
}

export interface TreeExportRequest {
  project: string;
  team: string;
  level: string;
  format: 'csv' | 'excel';
}

export interface ExportPayload {
  filename: string;
  mime: string;
  data: string | Blob;
}

const CSV_MIME = 'text/csv;charset=utf-8';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Depth-first flatten of the tree into export rows: prepends an "Order" column
 * (1-based backlog position for level items, blank for nested children) and
 * indents the Title cell by depth so the hierarchy is visible.
 */
export function flattenTreeForExport(tree: TreeTable, levelIds: number[]): Table {
  const order = new Map<number, number>();
  levelIds.forEach((id, i) => order.set(id, i + 1));
  const rows: CellValue[][] = [];

  const visit = (id: number, depth: number): void => {
    const n = tree.nodes.get(id);
    if (!n) return;
    const cells = n.cells.slice();
    if (tree.titleIndex >= 0 && depth > 0 && typeof cells[tree.titleIndex] === 'string') {
      cells[tree.titleIndex] = INDENT.repeat(depth) + cells[tree.titleIndex];
    }
    rows.push([order.get(id) ?? '', ...cells]);
    for (const child of n.childIds) visit(child, depth + 1);
  };
  for (const root of tree.roots) visit(root, 0);

  // columns carries the work-item columns; the "Order" header is export-only (toCsv/xlsx use headers + rows).
  return { columns: tree.columns, headers: ['Order', ...tree.headers], rows };
}

/**
 * Builds a hierarchical export of a whole backlog level: the level items as
 * roots with their descendants nested beneath, Task rollup sums, and the
 * native-grid column set (minus Story Points).
 */
export async function buildBacklogTreeExport(deps: TreeExportDeps, req: TreeExportRequest): Promise<ExportPayload> {
  const levels = await deps.backlog.getBacklogLevels(req.project, req.team);
  const match = levels.find((l) => l.name.toLowerCase() === req.level.toLowerCase());
  if (!match) {
    const known = levels.map((l) => l.name).join(', ');
    throw new Error(`Backlog level "${req.level}" not found for team "${req.team}". Available: ${known}`);
  }

  const levelIds = await deps.backlog.getBacklogWorkItemIds(req.project, req.team, match.id);
  const down = await deps.workItems.getDescendants(req.project, levelIds);
  const orderedIds = [...new Set([...levelIds, ...down.ids])];

  const columns = treeExportColumns();
  const fields = await deps.workItems.getFieldsBatch(req.project, orderedIds, neededFields(columns));
  const { parentOf, childrenOf } = parentChild(orderedIds, fields);
  const rollups = computeRollups({ ids: orderedIds, parentOf, childrenOf, fields, sums: sumSpecsOf(columns) });
  const tree = buildTree({ orderedIds, levelIds, parentOf, columns, fields, rollups });
  const table = flattenTreeForExport(tree, levelIds);

  const base = `${req.team} - ${match.name}`;
  if (req.format === 'csv') {
    return { filename: `${base}.csv`, mime: CSV_MIME, data: toCsv(table) };
  }
  return { filename: `${base}.xlsx`, mime: XLSX_MIME, data: toXlsxBlob(table) };
}
