import { Rollups } from '../models/types';

const DEFAULT_CLOSED = new Set(['Closed', 'Done', 'Completed']);

/** A rollup-sum spec: a numeric field, optionally scoped to one work item type. */
export interface SumSpec {
  field: string;
  ofType?: string;
}

/** Stable key for a sum spec, shared by computeRollups output and TableBuilder lookup. */
export function rollupKey(field: string, ofType?: string): string {
  return `${field}@${ofType ?? ''}`;
}

interface Args {
  ids: number[];
  parentOf: Map<number, number | null>;
  childrenOf: Map<number, number[]>;
  fields: Map<number, Record<string, unknown>>;
  sums: SumSpec[];
  closedStates?: Set<string>;
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function title(fields: Map<number, Record<string, unknown>>, id: number): string {
  const t = fields.get(id)?.['System.Title'];
  return typeof t === 'string' ? t : '';
}

/** Computes subtree sums, descendant counts, and hierarchy path/level/parent per work item. */
export function computeRollups(args: Args): Rollups {
  const { ids, parentOf, childrenOf, fields, sums } = args;
  const closed = args.closedStates ?? DEFAULT_CLOSED;

  const sum = new Map<string, Map<number, number>>();
  const sumKeys = sums.map((s) => ({ ...s, key: rollupKey(s.field, s.ofType) }));
  for (const s of sumKeys) sum.set(s.key, new Map());
  const countAll = new Map<number, number>();
  const countClosed = new Map<number, number>();
  const path = new Map<number, string>();
  const level = new Map<number, number>();
  const parentTitle = new Map<number, string>();

  // Post-order DFS from each root so children are computed before parents (cycle-safe via visited).
  const visited = new Set<number>();
  const roots = ids.filter((id) => parentOf.get(id) == null);

  function dfs(id: number, depth: number, ancestors: string[]): void {
    if (visited.has(id)) return;
    visited.add(id);
    level.set(id, depth);
    const p = parentOf.get(id) ?? null;
    parentTitle.set(id, p === null ? '' : title(fields, p));
    const selfTitle = title(fields, id);
    path.set(id, [...ancestors, selfTitle].join(' / '));

    let descAll = 0;
    let descClosed = 0;
    const selfFields = fields.get(id) ?? {};
    const selfType = selfFields['System.WorkItemType'];
    // Self contributes its field value only when no type scope is set, or its type matches.
    for (const s of sumKeys) {
      const matches = !s.ofType || s.ofType === selfType;
      sum.get(s.key)!.set(id, matches ? num(selfFields[s.field]) : 0);
    }

    for (const child of childrenOf.get(id) ?? []) {
      dfs(child, depth + 1, [...ancestors, selfTitle]);
      descAll += 1 + (countAll.get(child) ?? 0);
      const childState = fields.get(child)?.['System.State'];
      const childClosed = typeof childState === 'string' && closed.has(childState) ? 1 : 0;
      descClosed += childClosed + (countClosed.get(child) ?? 0);
      for (const s of sumKeys) sum.get(s.key)!.set(id, (sum.get(s.key)!.get(id) ?? 0) + (sum.get(s.key)!.get(child) ?? 0));
    }
    countAll.set(id, descAll);
    countClosed.set(id, descClosed);
  }

  for (const r of roots) dfs(r, 0, []);
  // Any node not reachable from a root (orphan) still gets defaults.
  for (const id of ids) if (!visited.has(id)) dfs(id, 0, []);

  return { sum, countAll, countClosed, path, level, parentTitle };
}
