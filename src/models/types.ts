/** A work item reduced to its id + field bag (System.* / Microsoft.VSTS.* / custom). */
export interface WorkItem {
  id: number;
  fields: Record<string, unknown>;
}

/** A field definition from the Fields API. */
export interface FieldDef {
  referenceName: string; // e.g. "System.Title"
  name: string; // e.g. "Title"
  type: string; // "string" | "integer" | "double" | "dateTime" | "boolean" | ...
}

/** A WIQL execution result (flat queries return workItems, tree queries return workItemRelations). */
export interface WiqlResult {
  queryType?: string;
  workItems?: { id: number }[];
  workItemRelations?: Relation[];
}

export interface Relation {
  rel: string | null;
  source: { id: number } | null;
  target: { id: number };
}

/** Hierarchy derived from a recursive workItemLinks result. */
export interface TreeRelations {
  ids: number[];
  parentOf: Map<number, number | null>;
  childrenOf: Map<number, number[]>;
  roots: number[];
}

/** A column the user can show. Stored fields + computed/online columns. */
export type Column =
  | { kind: 'field'; referenceName: string; header: string }
  | { kind: 'rollupSum'; field: string; ofType?: string; header: string }
  | { kind: 'childCount'; variant: 'all' | 'closed'; header: string }
  | { kind: 'parent'; header: string }
  | { kind: 'hierarchyPath'; header: string }
  | { kind: 'level'; header: string };

/** Computed values keyed by work item id. */
export interface Rollups {
  sum: Map<string, Map<number, number>>; // field -> (id -> subtree sum)
  countAll: Map<number, number>;
  countClosed: Map<number, number>;
  path: Map<number, string>;
  level: Map<number, number>;
  parentTitle: Map<number, string>;
}

export type CellValue = string | number | null;

/** Final exportable table; rows aligned to columns. */
export interface Table {
  columns: Column[];
  headers: string[];
  rows: CellValue[][];
}

export interface TreeNode {
  id: number;
  cells: CellValue[]; // aligned to columns
  childIds: number[];
  isLevel: boolean; // a selected backlog-level item
}

export interface TreeTable {
  columns: Column[];
  headers: string[];
  titleIndex: number; // index of the 'Title' column for indentation, -1 if absent
  nodes: Map<number, TreeNode>;
  roots: number[];
}

/** A node in the saved-query tree. */
export interface QueryNode {
  id: string;
  name: string;
  path: string;
  isFolder: boolean;
  hasChildren?: boolean;
  children: QueryNode[];
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface SharedUser {
  id: string;
  displayName: string;
}

export interface TemplateSource {
  kind: 'backlog' | 'query';
  project: string;
  team?: string;
  backlogId?: string;
  queryId?: string;
  itemType?: string;
  /** Human-readable description for the list, e.g. "Contoso / Ops / Stories". */
  label: string;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  source: TemplateSource;
  columns: Column[];
  owner: SharedUser;
  sharedWith: SharedUser[];
}
