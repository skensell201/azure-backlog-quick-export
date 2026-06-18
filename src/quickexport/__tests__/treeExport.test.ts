import { flattenTreeForExport, buildBacklogTreeExport, TreeExportDeps, INDENT } from '../treeExport';
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
  it('prepends an Order column and indents Title by depth, depth-first', () => {
    const table = flattenTreeForExport(tree(), [1, 3]);
    expect(table.headers).toEqual(['Order', 'Work Item Type', 'Title', 'ID']);
    expect(table.rows).toEqual([
      [1, 'User Story', 'Story A', 1],
      ['', 'Task', `${INDENT}Task 1`, 2],
      [2, 'User Story', 'Story B', 3],
    ]);
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
        getBacklogLevels: async (): Promise<NamedRef[]> => [
          { id: 'Microsoft.RequirementCategory', name: 'Stories' },
        ],
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

  it('rolls Task estimates up to the parent and nests children under the level item', async () => {
    const out = await buildBacklogTreeExport(deps(), {
      project: 'P',
      team: 'T',
      level: 'stories',
      format: 'csv',
    });
    expect(out.filename).toBe('T - Stories.csv');
    const csv = out.data as string;
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Order,Work Item Type,Title');
    expect(lines[0]).toContain('Sum of Task Original Estimate,Sum of Task Completed Work,ID');
    // Story A is order 1 with rolled-up sums 5 and 3 from its child Task.
    expect(lines[1]).toContain('1,User Story,Story A');
    expect(lines[1]).toContain(',5,3,100');
    // The Task nests under Story A (indented title, no Order).
    expect(lines[2]).toContain('Task 1');
    expect(lines[2]).toMatch(/^,Task,/);
    // Story B is order 2 with zero rollups.
    expect(lines[3]).toContain('2,User Story,Story B');
  });

  it('produces an xlsx Blob for the excel format', async () => {
    const out = await buildBacklogTreeExport(deps(), { project: 'P', team: 'T', level: 'Stories', format: 'excel' });
    expect(out.filename).toBe('T - Stories.xlsx');
    expect(out.data).toBeInstanceOf(Blob);
  });

  it('throws a clear error for an unknown level', async () => {
    await expect(
      buildBacklogTreeExport(deps(), { project: 'P', team: 'T', level: 'Nope', format: 'csv' })
    ).rejects.toThrow(/Backlog level "Nope" not found.*Available: Stories/);
  });
});
