import {
  flattenTreeForExport,
  buildBacklogTreeExport,
  workItemUrl,
  TreeExportDeps,
  INDENT,
} from '../treeExport';
import { Column, NamedRef, TreeNode, TreeTable, TreeRelations } from '../../models/types';

const COLUMNS: Column[] = [
  { kind: 'field', referenceName: 'System.WorkItemType', header: 'Work Item Type' },
  { kind: 'field', referenceName: 'System.Title', header: 'Title' },
  { kind: 'field', referenceName: 'System.Id', header: 'ID' },
];

function node(id: number, type: string, title: string, childIds: number[], isLevel: boolean): TreeNode {
  return { id, cells: [type, title, id], childIds, isLevel };
}

function tree(): TreeTable {
  // 1 (level) -> 2 (child task); 3 (level, no children)
  const nodes = new Map<number, TreeNode>([
    [1, node(1, 'User Story', 'Story A', [2], true)],
    [2, node(2, 'Task', 'Task 1', [], false)],
    [3, node(3, 'User Story', 'Story B', [], true)],
  ]);
  return { columns: COLUMNS, headers: ['Work Item Type', 'Title', 'ID'], titleIndex: 1, nodes, roots: [1, 3] };
}

describe('flattenTreeForExport', () => {
  it('prepends Order, indents Title by depth, and reports row work-item ids', () => {
    const out = flattenTreeForExport(tree(), [1, 3]);
    expect(out.headers).toEqual(['Order', 'Work Item Type', 'Title', 'ID']);
    expect(out.rowIds).toEqual([1, 2, 3]);
    expect(out.rows).toEqual([
      [1, 'User Story', 'Story A', 1],
      ['', 'Task', `${INDENT}Task 1`, 2],
      [2, 'User Story', 'Story B', 3],
    ]);
  });
});

describe('workItemUrl', () => {
  it('builds a work-item edit URL under the collection + project', () => {
    expect(workItemUrl('http://srv/col/', 'GIS BIOM', 741139)).toBe(
      'http://srv/col/GIS%20BIOM/_workitems/edit/741139'
    );
  });
});

describe('buildBacklogTreeExport', () => {
  function deps(): TreeExportDeps {
    const descendants: TreeRelations = {
      ids: [100, 200, 101],
      parentOf: new Map(),
      childrenOf: new Map(),
      roots: [100, 200],
    };
    return {
      backlog: {
        getBacklogLevels: async (): Promise<NamedRef[]> => [{ id: 'Microsoft.RequirementCategory', name: 'Stories' }],
        getBacklogWorkItemIds: async (): Promise<number[]> => [100, 200],
      },
      workItems: {
        getDescendants: async (): Promise<TreeRelations> => descendants,
        getFieldsBatch: async (_p: string, ids: number[]) =>
          new Map<number, Record<string, unknown>>(
            ids.map((id) => {
              if (id === 100) return [id, { 'System.Id': 100, 'System.Title': 'Story A', 'System.WorkItemType': 'User Story' }];
              if (id === 200) return [id, { 'System.Id': 200, 'System.Title': 'Story B', 'System.WorkItemType': 'User Story' }];
              return [
                id,
                {
                  'System.Id': 101,
                  'System.Title': 'Task 1',
                  'System.WorkItemType': 'Task',
                  'System.Parent': 100,
                  'Microsoft.VSTS.Scheduling.OriginalEstimate': 5,
                  'Microsoft.VSTS.Scheduling.CompletedWork': 3,
                },
              ];
            })
          ),
      },
    };
  }

  const base = { project: 'P', team: 'T', collectionUrl: 'http://srv/col' } as const;

  it('puts ID second (after Order), rolls up sums, nests children, and appends a URL column for CSV', async () => {
    const out = await buildBacklogTreeExport(deps(), { ...base, level: 'stories', format: 'csv' });
    expect(out.filename).toBe('T - Stories.csv');
    const lines = (out.data as string).trim().split('\n');
    expect(lines[0]).toContain('Order,ID,Work Item Type,Title');
    expect(lines[0]).toContain('Sum of Task Completed Work,URL');
    // Story A: order 1, ID 100 (second column), rolled-up sums 5/3, and its edit URL.
    expect(lines[1]).toMatch(/^1,100,User Story,Story A,/);
    expect(lines[1]).toContain(',5,3,http://srv/col/P/_workitems/edit/100');
    // The Task nests under Story A (indented title, blank Order, ID 101).
    expect(lines[2]).toMatch(/^,101,Task,/);
    expect(lines[2]).toContain('Task 1');
    // Story B: order 2.
    expect(lines[3]).toMatch(/^2,200,User Story,Story B,/);
  });

  it('produces an xlsx Blob for the excel format', async () => {
    const out = await buildBacklogTreeExport(deps(), { ...base, level: 'Stories', format: 'excel' });
    expect(out.filename).toBe('T - Stories.xlsx');
    expect(out.data).toBeInstanceOf(Blob);
  });

  it('throws a clear error for an unknown level', async () => {
    await expect(
      buildBacklogTreeExport(deps(), { ...base, level: 'Nope', format: 'csv' })
    ).rejects.toThrow(/Backlog level "Nope" not found.*Available: Stories/);
  });
});
