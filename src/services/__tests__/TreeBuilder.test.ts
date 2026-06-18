import { buildTree, flattenTree, filterTree, levelCount } from '../TreeBuilder';
import { Column, Rollups } from '../../models/types';

// Epic(1) → Feature(2) → US(3) → Task(4); plus an unrelated US(5) with a Task(6).
const columns: Column[] = [
  { kind: 'field', referenceName: 'System.Title', header: 'Title' },
  { kind: 'field', referenceName: 'System.State', header: 'State' },
];

const fields = new Map<number, Record<string, unknown>>([
  [1, { 'System.Title': 'Epic', 'System.State': 'New' }],
  [2, { 'System.Title': 'Feature', 'System.State': 'New' }],
  [3, { 'System.Title': 'Story', 'System.State': 'Active' }],
  [4, { 'System.Title': 'Task', 'System.State': 'Active' }],
  [5, { 'System.Title': 'Other Story', 'System.State': 'New' }],
  [6, { 'System.Title': 'Other Task', 'System.State': 'New' }],
]);

const parentOf = new Map<number, number | null>([
  [1, null],
  [2, 1],
  [3, 2],
  [4, 3],
  [5, null],
  [6, 5],
]);

function emptyRollups(): Rollups {
  return {
    sum: new Map(),
    countAll: new Map(),
    countClosed: new Map(),
    path: new Map(),
    level: new Map(),
    parentTitle: new Map(),
  };
}

function tree() {
  return buildTree({
    orderedIds: [1, 2, 3, 4, 5, 6],
    levelIds: [3, 5], // the User Story level
    parentOf,
    columns,
    fields,
    rollups: emptyRollups(),
  });
}

describe('buildTree', () => {
  it('links children to parents in the set and lists orphans as roots', () => {
    const t = tree();
    expect(t.roots).toEqual([1, 5]);
    expect(t.nodes.get(1)!.childIds).toEqual([2]);
    expect(t.nodes.get(2)!.childIds).toEqual([3]);
    expect(t.nodes.get(3)!.childIds).toEqual([4]);
    expect(t.nodes.get(4)!.childIds).toEqual([]);
    expect(t.nodes.get(5)!.childIds).toEqual([6]);
  });

  it('marks level items and locates the Title column', () => {
    const t = tree();
    expect(t.titleIndex).toBe(0);
    expect(t.nodes.get(3)!.isLevel).toBe(true);
    expect(t.nodes.get(5)!.isLevel).toBe(true);
    expect(t.nodes.get(1)!.isLevel).toBe(false);
    expect(t.nodes.get(4)!.isLevel).toBe(false);
    expect(t.nodes.get(3)!.cells).toEqual(['Story', 'Active']);
  });

  it('treats a parent outside the set as a root', () => {
    const t = buildTree({
      orderedIds: [3, 4],
      levelIds: [3],
      parentOf,
      columns,
      fields,
      rollups: emptyRollups(),
    });
    expect(t.roots).toEqual([3]); // 3's parent (2) is not in the set
    expect(t.nodes.get(3)!.childIds).toEqual([4]);
  });
});

describe('flattenTree', () => {
  it('emits rows in depth-first (roots → children) order', () => {
    const flat = flattenTree(tree());
    expect(flat.headers).toEqual(['Title', 'State']);
    expect(flat.rows.map((r) => r[0])).toEqual(['Epic', 'Feature', 'Story', 'Task', 'Other Story', 'Other Task']);
  });
});

describe('filterTree', () => {
  it('keeps a matching descendant and its ancestors, dropping unrelated branches', () => {
    const filtered = filterTree(tree(), { text: 'task', byHeader: {} });
    const ids = [...filtered.nodes.keys()].sort((a, b) => a - b);
    // 'task' matches Task(4) and Other Task(6); ancestors of both are kept.
    expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('drops branches with no match', () => {
    const filtered = filterTree(tree(), { text: 'Other Task', byHeader: {} });
    const ids = [...filtered.nodes.keys()].sort((a, b) => a - b);
    expect(ids).toEqual([5, 6]); // only the Other Story branch survives
    expect(filtered.roots).toEqual([5]);
    expect(filtered.nodes.get(5)!.childIds).toEqual([6]);
  });
});

describe('levelCount', () => {
  it('counts level items present in the tree', () => {
    expect(levelCount(tree())).toBe(2);
    const filtered = filterTree(tree(), { text: 'Other Task', byHeader: {} });
    expect(levelCount(filtered)).toBe(1);
  });
});
