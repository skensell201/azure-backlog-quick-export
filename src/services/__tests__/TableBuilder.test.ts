import { buildTable } from '../TableBuilder';
import { rollupKey } from '../RollupService';
import { Column, Rollups } from '../../models/types';

function emptyRollups(): Rollups {
  return {
    sum: new Map([[rollupKey('Microsoft.VSTS.Scheduling.Effort'), new Map([[1, 8], [2, 3]])]]),
    countAll: new Map([[1, 2], [2, 0]]),
    countClosed: new Map([[1, 1], [2, 0]]),
    path: new Map([[1, 'Epic'], [2, 'Epic / Story']]),
    level: new Map([[1, 0], [2, 1]]),
    parentTitle: new Map([[1, ''], [2, 'Epic']]),
  };
}

describe('buildTable', () => {
  const fields = new Map<number, Record<string, unknown>>([
    [1, { 'System.Id': 1, 'System.Title': 'Epic', 'System.AssignedTo': { displayName: 'Ann' } }],
    [2, { 'System.Id': 2, 'System.Title': 'Story', 'System.AssignedTo': null }],
  ]);
  const columns: Column[] = [
    { kind: 'field', referenceName: 'System.Id', header: 'ID' },
    { kind: 'field', referenceName: 'System.Title', header: 'Title' },
    { kind: 'field', referenceName: 'System.AssignedTo', header: 'Assigned To' },
    { kind: 'rollupSum', field: 'Microsoft.VSTS.Scheduling.Effort', header: 'Sum of Effort' },
    { kind: 'childCount', variant: 'all', header: 'Children' },
    { kind: 'parent', header: 'Parent' },
    { kind: 'hierarchyPath', header: 'Hierarchy' },
    { kind: 'level', header: 'Level' },
  ];

  it('produces headers and rows aligned to columns', () => {
    const t = buildTable({ rowIds: [1, 2], columns, fields, rollups: emptyRollups() });
    expect(t.headers).toEqual(['ID', 'Title', 'Assigned To', 'Sum of Effort', 'Children', 'Parent', 'Hierarchy', 'Level']);
    expect(t.rows[0]).toEqual([1, 'Epic', 'Ann', 8, 2, '', 'Epic', 0]);
    expect(t.rows[1]).toEqual([2, 'Story', null, 3, 0, 'Epic', 'Epic / Story', 1]);
  });

  it('renders identity objects via displayName and missing values as null', () => {
    const t = buildTable({
      rowIds: [1],
      columns: [{ kind: 'field', referenceName: 'System.AssignedTo', header: 'Assigned To' }],
      fields,
      rollups: emptyRollups(),
    });
    expect(t.rows[0][0]).toBe('Ann');
  });
});
