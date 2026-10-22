import { apiClient } from '@/lib/api-client';
import { CreateWorkspaceDto, Workspace } from '../types';

export const workspacesApi = {
  async list(): Promise<Workspace[]> {
    const res = await apiClient.get<Workspace[]>('/workspaces');
    return res.data;
  },

  async get(workspaceId: string): Promise<Workspace> {
    const res = await apiClient.get<Workspace>(`/workspaces/${workspaceId}`);
    return res.data;
  },

  async create(dto: CreateWorkspaceDto): Promise<Workspace> {
    const res = await apiClient.post<Workspace>('/workspaces', dto);
    return res.data;
  },
};
