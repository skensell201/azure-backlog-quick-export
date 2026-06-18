import { Column } from '../models/types';

/**
 * Columns for the backlog tree export — mirrors the native backlog grid
 * (minus Story Points), with Task rollup sums. "Order" is prepended at
 * flatten time (it is a per-row position, not a work-item field).
 */
export function treeExportColumns(): Column[] {
  return [
    { kind: 'field', referenceName: 'System.WorkItemType', header: 'Work Item Type' },
    { kind: 'field', referenceName: 'System.Title', header: 'Title' },
    { kind: 'field', referenceName: 'System.State', header: 'State' },
    { kind: 'field', referenceName: 'Microsoft.VSTS.Common.ValueArea', header: 'Value Area' },
    { kind: 'field', referenceName: 'System.IterationPath', header: 'Iteration Path' },
    { kind: 'field', referenceName: 'System.Tags', header: 'Tags' },
    {
      kind: 'rollupSum',
      field: 'Microsoft.VSTS.Scheduling.OriginalEstimate',
      ofType: 'Task',
      header: 'Sum of Task Original Estimate',
    },
    {
      kind: 'rollupSum',
      field: 'Microsoft.VSTS.Scheduling.CompletedWork',
      ofType: 'Task',
      header: 'Sum of Task Completed Work',
    },
    { kind: 'field', referenceName: 'System.Id', header: 'ID' },
  ];
}
