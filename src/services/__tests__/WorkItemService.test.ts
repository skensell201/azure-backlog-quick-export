import { WorkItemService } from '../WorkItemService';
import { ApiClient } from '../ApiClient';

describe('WorkItemService', () => {
  it('fetches descendants via a recursive workItemLinks WIQL scoped to root ids', async () => {
    const post = jest.fn().mockResolvedValue({
      workItemRelations: [
        { rel: null, source: null, target: { id: 1 } },
        { rel: 'System.LinkTypes.Hierarchy-Forward', source: { id: 1 }, target: { id: 2 } },
      ],
    });
    const api: ApiClient = { get: jest.fn(), post };
    const svc = new WorkItemService(api);
    const tree = await svc.getDescendants('Contoso', [1]);
    expect(tree.childrenOf.get(1)).toEqual([2]);
    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/Contoso/_apis/wit/wiql?api-version=6.0');
    expect((body as { query: string }).query).toContain('MODE (Recursive)');
    expect((body as { query: string }).query).toContain('[Source].[System.Id] IN (1)');
  });

  it('batch-fetches fields via GET workitems in chunks of 100 and merges into a map', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => i + 1);
    const get = jest.fn().mockImplementation((url: string) => {
      const chunkIds = url.match(/ids=([^&]+)/)![1].split(',').map(Number);
      return Promise.resolve({ value: chunkIds.map((id) => ({ id, fields: { 'System.Id': id } })) });
    });
    const api: ApiClient = { get, post: jest.fn() };
    const svc = new WorkItemService(api);
    const map = await svc.getFieldsBatch('Contoso', ids, ['System.Id']);
    expect(map.size).toBe(250);
    expect(map.get(1)).toEqual({ 'System.Id': 1 });
    expect(get).toHaveBeenCalledTimes(3); // 100 + 100 + 50
    const firstUrl = get.mock.calls[0][0] as string;
    expect(firstUrl).toContain('/Contoso/_apis/wit/workitems?ids=');
    expect(firstUrl).toContain('fields=System.Id');
    expect(firstUrl).toContain('errorPolicy=omit');
  });

  it('climbs System.Parent level by level and stops at the top', async () => {
    // 3 → 2 → 1 → (no parent). Inputs: [3].
    const parents = new Map<number, number>([[3, 2], [2, 1]]);
    const get = jest.fn().mockImplementation((url: string) => {
      const chunkIds = url.match(/ids=([^&]+)/)![1].split(',').map(Number);
      return Promise.resolve({
        value: chunkIds.map((id) => {
          const p = parents.get(id);
          return { id, fields: p ? { 'System.Parent': p } : {} };
        }),
      });
    });
    const api: ApiClient = { get, post: jest.fn() };
    const svc = new WorkItemService(api);
    const ancestors = await svc.getAncestors('Contoso', [3]);
    expect(ancestors).toEqual([2, 1]); // excludes the input, climbs to the root
    expect(get).toHaveBeenCalledTimes(3); // frontier [3] → [2] → [1] → [] stops
    expect((get.mock.calls[0][0] as string)).toContain('fields=System.Parent');
  });

  it('respects the 12-level cap on a long chain', async () => {
    // Each id points to id+1 forever; cap must stop the climb.
    const get = jest.fn().mockImplementation((url: string) => {
      const chunkIds = url.match(/ids=([^&]+)/)![1].split(',').map(Number);
      return Promise.resolve({ value: chunkIds.map((id) => ({ id, fields: { 'System.Parent': id + 1 } })) });
    });
    const api: ApiClient = { get, post: jest.fn() };
    const svc = new WorkItemService(api);
    const ancestors = await svc.getAncestors('Contoso', [1]);
    expect(get).toHaveBeenCalledTimes(12);
    expect(ancestors).toHaveLength(12); // ids 2..13
  });

  it('returns empty map for no ids without calling the API', async () => {
    const api: ApiClient = { get: jest.fn(), post: jest.fn() };
    const svc = new WorkItemService(api);
    const map = await svc.getFieldsBatch('Contoso', [], ['System.Id']);
    expect(map.size).toBe(0);
    expect(api.get).not.toHaveBeenCalled();
  });
});
