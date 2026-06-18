import { Column } from '../models/types';
import { SumSpec, rollupKey } from './RollupService';

const ESSENTIAL = ['System.Id', 'System.Title', 'System.State', 'System.WorkItemType', 'System.Parent'];

/** Field references that must be fetched to satisfy the requested columns. */
export function neededFields(columns: Column[]): string[] {
  const set = new Set<string>(ESSENTIAL);
  for (const c of columns) {
    if (c.kind === 'field') set.add(c.referenceName);
    if (c.kind === 'rollupSum') set.add(c.field);
  }
  return [...set];
}

/** Distinct rollup-sum specs derived from the columns. */
export function sumSpecsOf(columns: Column[]): SumSpec[] {
  const seen = new Set<string>();
  const specs: SumSpec[] = [];
  for (const c of columns) {
    if (c.kind !== 'rollupSum') continue;
    const key = rollupKey(c.field, c.ofType);
    if (seen.has(key)) continue;
    seen.add(key);
    specs.push({ field: c.field, ofType: c.ofType });
  }
  return specs;
}

/** Derives parent/child maps from System.Parent, only linking when both ends are in the set. */
export function parentChild(ids: number[], fields: Map<number, Record<string, unknown>>) {
  const idSet = new Set(ids);
  const parentOf = new Map<number, number | null>();
  const childrenOf = new Map<number, number[]>();
  for (const id of ids) {
    const p = fields.get(id)?.['System.Parent'];
    const parent = typeof p === 'number' && idSet.has(p) ? p : null;
    parentOf.set(id, parent);
    if (parent != null) {
      const kids = childrenOf.get(parent) ?? [];
      kids.push(id);
      childrenOf.set(parent, kids);
    }
  }
  return { parentOf, childrenOf };
}
