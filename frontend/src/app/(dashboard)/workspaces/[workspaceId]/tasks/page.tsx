'use client';

import React from 'react';
import { useCurrentWorkspace } from '../workspace-context';
import { TaskList } from '@/features/tasks/components/task-list';

export default function WorkspaceTasksPage() {
  const { workspaceId } = useCurrentWorkspace();

  return <TaskList workspaceId={workspaceId} />;
}
