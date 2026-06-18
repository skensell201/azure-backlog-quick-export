import { BacklogService } from '../BacklogService';
import { ApiClient } from '../ApiClient';

describe('BacklogService', () => {
  it('lists backlog levels for a team', async () => {
    const api: ApiClient = {
      get: jest.fn().mockResolvedValue({
        value: [
          { id: 'Microsoft.EpicCategory', name: 'Epics' },
          { id: 'Microsoft.RequirementCategory', name: 'Stories' },
        ],
      }),
      post: jest.fn(),
    };
    const svc = new BacklogService(api);
    const levels = await svc.getBacklogLevels('Contoso', 'Ops Team');
    expect(levels.map((l) => l.name)).toEqual(['Epics', 'Stories']);
    expect(api.get).toHaveBeenCalledWith('/Contoso/Ops%20Team/_apis/work/backlogs?api-version=6.0-preview.1');
  });

  it('returns work item ids at a backlog level', async () => {
    const api: ApiClient = {
      get: jest.fn().mockResolvedValue({ workItems: [{ target: { id: 10 } }, { target: { id: 11 } }] }),
      post: jest.fn(),
    };
    const svc = new BacklogService(api);
    const ids = await svc.getBacklogWorkItemIds('Contoso', 'Ops Team', 'Microsoft.RequirementCategory');
    expect(ids).toEqual([10, 11]);
    expect(api.get).toHaveBeenCalledWith(
      '/Contoso/Ops%20Team/_apis/work/backlogs/Microsoft.RequirementCategory/workItems?api-version=6.0-preview.1'
    );
  });
});
