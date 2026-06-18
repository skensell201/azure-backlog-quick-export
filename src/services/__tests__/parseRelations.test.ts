import { parseRelations } from '../parseRelations';
import { Relation } from '../../models/types';

describe('parseRelations', () => {
  it('builds parent/child maps and roots from a recursive tree result', () => {
    const relations: Relation[] = [
      { rel: null, source: null, target: { id: 1 } },
      { rel: 'System.LinkTypes.Hierarchy-Forward', source: { id: 1 }, target: { id: 2 } },
      { rel: 'System.LinkTypes.Hierarchy-Forward', source: { id: 2 }, target: { id: 3 } },
      { rel: null, source: null, target: { id: 9 } },
    ];
    const t = parseRelations(relations);
    expect(t.roots).toEqual([1, 9]);
    expect(t.ids.sort((a, b) => a - b)).toEqual([1, 2, 3, 9]);
    expect(t.childrenOf.get(1)).toEqual([2]);
    expect(t.childrenOf.get(2)).toEqual([3]);
    expect(t.parentOf.get(3)).toBe(2);
    expect(t.parentOf.get(1)).toBe(null);
  });

  it('dedupes ids that appear as both source and target', () => {
    const relations: Relation[] = [
      { rel: null, source: null, target: { id: 1 } },
      { rel: 'System.LinkTypes.Hierarchy-Forward', source: { id: 1 }, target: { id: 2 } },
      { rel: 'System.LinkTypes.Hierarchy-Forward', source: { id: 1 }, target: { id: 3 } },
    ];
    const t = parseRelations(relations);
    expect(t.ids.sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(t.childrenOf.get(1)).toEqual([2, 3]);
  });
});
