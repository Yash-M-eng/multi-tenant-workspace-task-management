import { apiClient } from '@/lib/api-client';
import { AddMemberDto, WorkspaceMember } from '../types';

export const membersApi = {
  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const res = await apiClient.get<WorkspaceMember[]>(
      `/workspaces/${workspaceId}/members`,
    );
    return res.data;
  },

  async addMember(
    workspaceId: string,
    dto: AddMemberDto,
  ): Promise<WorkspaceMember> {
    const res = await apiClient.post<WorkspaceMember>(
      `/workspaces/${workspaceId}/members`,
      dto,
    );
    return res.data;
  },
};
