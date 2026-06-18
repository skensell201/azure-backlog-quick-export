import { ApiClient } from './ApiClient';
import { NamedRef } from '../models/types';

const V = 'api-version=6.0-preview.1';

export class BacklogService {
  constructor(private api: ApiClient) {}

  async getBacklogLevels(project: string, team: string): Promise<NamedRef[]> {
    const res = await this.api.get<{ value: NamedRef[] }>(
      `/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/backlogs?${V}`
    );
    return res.value;
  }

  async getBacklogWorkItemIds(project: string, team: string, backlogId: string): Promise<number[]> {
    const res = await this.api.get<{ workItems: { target: { id: number } }[] }>(
      `/${encodeURIComponent(project)}/${encodeURIComponent(team)}/_apis/work/backlogs/${backlogId}/workItems?${V}`
    );
    return res.workItems.map((w) => w.target.id);
  }
}
