import { Relation, TreeRelations } from '../models/types';

/** Converts a recursive workItemLinks result into hierarchy maps. */
export function parseRelations(relations: Relation[]): TreeRelations {
  const ids = new Set<number>();
  const parentOf = new Map<number, number | null>();
  const childrenOf = new Map<number, number[]>();
  const roots: number[] = [];

  for (const r of relations) {
    const targetId = r.target.id;
    ids.add(targetId);
    if (r.source === null) {
      roots.push(targetId);
      if (!parentOf.has(targetId)) parentOf.set(targetId, null);
    } else {
      const sourceId = r.source.id;
      ids.add(sourceId);
      parentOf.set(targetId, sourceId);
      const kids = childrenOf.get(sourceId) ?? [];
      kids.push(targetId);
      childrenOf.set(sourceId, kids);
    }
  }
  return { ids: [...ids], parentOf, childrenOf, roots };
}
