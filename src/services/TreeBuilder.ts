import { CellValue, Column, Rollups, TreeNode, TreeTable } from '../models/types';
import { buildRow } from './TableBuilder';
import { Filters, matchesFilters } from './filter';

interface Args {
  orderedIds: number[]; // all node ids, in display order (ancestors, level, descendants)
  levelIds: number[]; // the backlog-level items
  parentOf: Map<number, number | null>;
  columns: Column[];
  fields: Map<number, Record<string, unknown>>;
  rollups: Rollups;
}

export function buildTree(args: Args): TreeTable {
  const { orderedIds, parentOf, columns, fields, rollups } = args;
  const inSet = new Set(orderedIds);
  const levelSet = new Set(args.levelIds);
  const headers = columns.map((c) => c.header);
  const nodes = new Map<number, TreeNode>();
  for (const id of orderedIds) {
    nodes.set(id, { id, cells: buildRow(columns, id, fields, rollups), childIds: [], isLevel: levelSet.has(id) });
  }
  const roots: number[] = [];
  for (const id of orderedIds) {
    const p = parentOf.get(id);
    if (p != null && inSet.has(p)) nodes.get(p)!.childIds.push(id);
    else roots.push(id);
  }
  return { columns, headers, titleIndex: headers.indexOf('Title'), nodes, roots };
}

/** Depth-first flatten (roots → children), for "visible tree" export. */
export function flattenTree(tree: TreeTable): { columns: Column[]; headers: string[]; rows: CellValue[][] } {
  const rows: CellValue[][] = [];
  const visit = (id: number): void => {
    const n = tree.nodes.get(id);
    if (!n) return;
    rows.push(n.cells);
    for (const c of n.childIds) visit(c);
  };
  for (const r of tree.roots) visit(r);
  return { columns: tree.columns, headers: tree.headers, rows };
}

/** Keeps nodes that match the filters OR have a kept descendant (ancestors of matches stay). */
export function filterTree(tree: TreeTable, filters: Filters): TreeTable {
  const keep = new Set<number>();
  const consider = (id: number): boolean => {
    const n = tree.nodes.get(id);
    if (!n) return false;
    let keepChild = false;
    for (const c of n.childIds) keepChild = consider(c) || keepChild;
    const self = matchesFilters(tree.headers, n.cells, filters);
    if (self || keepChild) {
      keep.add(id);
      return true;
    }
    return false;
  };
  for (const r of tree.roots) consider(r);
  const nodes = new Map<number, TreeNode>();
  for (const [id, n] of tree.nodes) {
    if (!keep.has(id)) continue;
    nodes.set(id, { ...n, childIds: n.childIds.filter((c) => keep.has(c)) });
  }
  return { ...tree, nodes, roots: tree.roots.filter((r) => keep.has(r)) };
}

/** Count of kept level items (for the "N items" indicator). */
export function levelCount(tree: TreeTable): number {
  let n = 0;
  for (const node of tree.nodes.values()) if (node.isLevel) n++;
  return n;
}
