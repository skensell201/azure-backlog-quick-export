import { ApiClient } from './ApiClient';
import { TreeRelations, WiqlResult } from '../models/types';
import { parseRelations } from './parseRelations';
import { runBatched } from '../utils/batch';

// Smaller chunk keeps the GET workitems query string under on-prem IIS URL limits.
const CHUNK = 100;

export class WorkItemService {
  constructor(private api: ApiClient) {}

  /** Recursive hierarchy expansion from the given root ids (their whole subtrees). */
  async getDescendants(project: string, rootIds: number[]): Promise<TreeRelations> {
    // Guard the WIQL id list: only integers are interpolated into the query string.
    const safeIds = rootIds.filter((n) => Number.isInteger(n));
    if (safeIds.length === 0) return { ids: [], parentOf: new Map(), childrenOf: new Map(), roots: [] };
    const query =
      `SELECT [System.Id] FROM workitemLinks ` +
      `WHERE ([System.Links.LinkType] = 'System.LinkTypes.Hierarchy-Forward') ` +
      `AND ([Source].[System.Id] IN (${safeIds.join(',')})) MODE (Recursive)`;
    const res = await this.api.post<WiqlResult>(
      `/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=6.0`,
      { query }
    );
    return parseRelations(res.workItemRelations ?? []);
  }

  /** Walks up System.Parent from the given ids; returns the ancestor ids (excludes the inputs). */
  async getAncestors(project: string, ids: number[]): Promise<number[]> {
    const inputs = new Set(ids);
    const ancestors = new Set<number>();
    let frontier = ids;
    for (let depth = 0; depth < 12 && frontier.length > 0; depth++) {
      const fields = await this.getFieldsBatch(project, frontier, ['System.Parent']);
      const next: number[] = [];
      for (const id of frontier) {
        const p = fields.get(id)?.['System.Parent'];
        if (typeof p === 'number' && !inputs.has(p) && !ancestors.has(p)) {
          ancestors.add(p);
          next.push(p);
        }
      }
      frontier = next;
    }
    return [...ancestors];
  }

  /** Fetches fields for the given ids in chunks; merges into id -> fields.
   *  Uses GET _apis/wit/workitems (universally supported; some on-prem builds 404 on the
   *  POST workitemsbatch route). errorPolicy=omit skips ids the user cannot read. */
  async getFieldsBatch(
    project: string,
    ids: number[],
    fields: string[]
  ): Promise<Map<number, Record<string, unknown>>> {
    const result = new Map<number, Record<string, unknown>>();
    if (ids.length === 0) return result;
    const fieldsParam = fields.join(',');
    const chunks: number[][] = [];
    for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
    const responses = await runBatched(chunks, (chunk) =>
      this.api.get<{ value: { id: number; fields: Record<string, unknown> }[] }>(
        `/${encodeURIComponent(project)}/_apis/wit/workitems?ids=${chunk.join(',')}` +
          `&fields=${fieldsParam}&errorPolicy=omit&api-version=6.0`
      )
    );
    for (const res of responses) for (const wi of res.value) result.set(wi.id, wi.fields);
    return result;
  }
}
