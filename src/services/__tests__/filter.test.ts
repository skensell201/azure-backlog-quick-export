import { applyFilters, distinctValues, filterableColumns, matchesFilters, EMPTY_FILTERS } from '../filter';
import { Table } from '../../models/types';

const table: Table = {
  columns: [],
  headers: ['ID', 'Work Item Type', 'Title', 'State', 'Value Area', 'Tags'],
  rows: [
    [1, 'User Story', 'Alpha', 'Resolved', 'Dev', 'a; b'],
    [2, 'Bug', 'Beta', 'Active', 'Business', 'b'],
    [3, 'User Story', 'Gamma resolved', 'Active', 'Dev', ''],
  ],
};

describe('filterableColumns', () => {
  it('returns filterable headers present in the table with their index', () => {
    expect(filterableColumns(table)).toEqual([
      { header: 'Work Item Type', index: 1 },
      { header: 'State', index: 3 },
      { header: 'Value Area', index: 4 },
      { header: 'Tags', index: 5 },
    ]);
  });
});

describe('distinctValues', () => {
  it('lists sorted distinct cell values for a column', () => {
    expect(distinctValues(table, { header: 'State', index: 3 })).toEqual(['Active', 'Resolved']);
  });
  it('splits tags into individual tokens', () => {
    expect(distinctValues(table, { header: 'Tags', index: 5 })).toEqual(['a', 'b']);
  });
});

describe('applyFilters', () => {
  it('returns all rows for empty filters', () => {
    expect(applyFilters(table, EMPTY_FILTERS).rows).toHaveLength(3);
  });
  it('text search matches any cell (case-insensitive)', () => {
    expect(applyFilters(table, { text: 'resolved', byHeader: {} }).rows.map((r) => r[0])).toEqual([1, 3]);
  });
  it('exact-matches a field filter', () => {
    expect(applyFilters(table, { text: '', byHeader: { State: 'Active' } }).rows.map((r) => r[0])).toEqual([2, 3]);
  });
  it('matches a tag token (cell may hold several tags)', () => {
    expect(applyFilters(table, { text: '', byHeader: { Tags: 'b' } }).rows.map((r) => r[0])).toEqual([1, 2]);
  });
  it('combines text and field filters (AND)', () => {
    const f = { text: 'gamma', byHeader: { 'Work Item Type': 'User Story' } };
    expect(applyFilters(table, f).rows.map((r) => r[0])).toEqual([3]);
  });
  it('ignores blank field selections', () => {
    expect(applyFilters(table, { text: '', byHeader: { State: '' } }).rows).toHaveLength(3);
  });
});

describe('matchesFilters', () => {
  const headers = table.headers;
  it('returns true for empty filters', () => {
    expect(matchesFilters(headers, table.rows[0], EMPTY_FILTERS)).toBe(true);
  });
  it('matches text in any cell (case-insensitive) and rejects non-matches', () => {
    expect(matchesFilters(headers, table.rows[0], { text: 'alpha', byHeader: {} })).toBe(true);
    expect(matchesFilters(headers, table.rows[1], { text: 'alpha', byHeader: {} })).toBe(false);
  });
  it('exact-matches a field filter (AND with text)', () => {
    expect(matchesFilters(headers, table.rows[1], { text: '', byHeader: { State: 'Active' } })).toBe(true);
    expect(matchesFilters(headers, table.rows[0], { text: '', byHeader: { State: 'Active' } })).toBe(false);
  });
  it('matches a tag token among several', () => {
    expect(matchesFilters(headers, table.rows[0], { text: '', byHeader: { Tags: 'a' } })).toBe(true);
    expect(matchesFilters(headers, table.rows[1], { text: '', byHeader: { Tags: 'a' } })).toBe(false);
  });
});
