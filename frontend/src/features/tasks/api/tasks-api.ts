import { apiClient } from '@/lib/api-client';
import {
  CreateTaskDto,
  PaginatedTasksResponse,
  Task,
  TaskFilters,
  UpdateTaskDto,
} from '../types';

export const tasksApi = {
  async list(
    workspaceId: string,
    filters: TaskFilters = {},
  ): Promise<PaginatedTasksResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);

    const queryString = params.toString();
    const url = `/workspaces/${workspaceId}/tasks${queryString ? `?${queryString}` : ''}`;
    const res = await apiClient.get<PaginatedTasksResponse>(url);
    return res.data;
  },

  async get(workspaceId: string, taskId: string): Promise<Task> {
    const res = await apiClient.get<Task>(
      `/workspaces/${workspaceId}/tasks/${taskId}`,
    );
    return res.data;
  },

  async create(workspaceId: string, dto: CreateTaskDto): Promise<Task> {
    const res = await apiClient.post<Task>(
      `/workspaces/${workspaceId}/tasks`,
      dto,
    );
    return res.data;
  },

  async update(
    workspaceId: string,
    taskId: string,
    dto: UpdateTaskDto,
    version?: number,
  ): Promise<Task> {
    const versionParam =
      typeof version === 'number' ? `?version=${version}` : '';
    const res = await apiClient.patch<Task>(
      `/workspaces/${workspaceId}/tasks/${taskId}${versionParam}`,
      dto,
    );
    return res.data;
  },

  async delete(workspaceId: string, taskId: string): Promise<void> {
    await apiClient.delete(`/workspaces/${workspaceId}/tasks/${taskId}`);
  },
};
