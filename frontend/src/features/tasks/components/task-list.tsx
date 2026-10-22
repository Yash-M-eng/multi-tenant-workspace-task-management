'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { tasksApi } from '../api/tasks-api';
import {
  PaginatedTasksResponse,
  Task,
  TaskPriority,
  TaskStatus,
} from '../types';
import { TaskCard } from './task-card';
import { TaskFormDialog } from './task-form-dialog';
import { TaskDeleteDialog } from './task-delete-dialog';
import { useTaskLocks } from '../hooks/use-task-locks';
import { getErrorMessage } from '@/lib/api-client';

interface TaskListProps {
  workspaceId: string;
}

export function TaskList({ workspaceId }: TaskListProps) {
  const [data, setData] = useState<PaginatedTasksResponse>({
    data: [],
    meta: { total: 0, page: 1, limit: 10, totalPages: 1 },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<TaskStatus | ''>('');
  const [priority, setPriority] = useState<TaskPriority | ''>('');
  const [page, setPage] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  // Real-time locks hook
  const { acquireLock, releaseLock, isTaskLockedByOther, getLockHolder } =
    useTaskLocks(workspaceId);

  const loadTasks = useCallback(async () => {
    try {
      const res = await tasksApi.list(workspaceId, {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status || undefined,
        priority: priority || undefined,
      });
      setData(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, page, search, status, priority]);

  useEffect(() => {
    let isMounted = true;
    tasksApi
      .list(workspaceId, {
        page,
        limit: 10,
        search: search.trim() || undefined,
        status: status || undefined,
        priority: priority || undefined,
      })
      .then((res) => {
        if (isMounted) {
          setData(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getErrorMessage(err));
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workspaceId, page, search, status, priority]);

  const handleTaskSaved = () => {
    loadTasks();
  };

  const handleTaskDeleted = () => {
    loadTasks();
  };

  const openCreateDialog = () => {
    setEditingTask(null);
    setIsFormOpen(true);
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const statusFilterOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'DONE', label: 'Done' },
  ];

  const priorityFilterOptions = [
    { value: '', label: 'All Priorities' },
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-600" />
            Tasks
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Create, manage, and collaborate on tasks in real-time.
          </p>
        </div>

        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-1.5" />
          New Task
        </Button>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <Input
            placeholder="Search tasks by title..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>

        <div className="sm:col-span-3">
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as TaskStatus | '');
              setPage(1);
            }}
            options={statusFilterOptions}
          />
        </div>

        <div className="sm:col-span-3">
          <Select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as TaskPriority | '');
              setPage(1);
            }}
            options={priorityFilterOptions}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Task List Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white border border-zinc-200 rounded-xl p-5 space-y-3"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      ) : data.data.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-12 text-center">
          <CheckSquare className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-900">
            No tasks found
          </h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            {search || status || priority
              ? 'Try adjusting your search criteria or filters.'
              : 'Create your first task to start organizing work.'}
          </p>
          <div className="mt-4">
            <Button onClick={openCreateDialog} variant="secondary" size="sm">
              <Plus className="w-4 h-4 mr-1.5" />
              Create Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={openEditDialog}
              onDelete={(t) => setDeletingTask(t)}
              lock={getLockHolder(task.id)}
              isLockedByOther={isTaskLockedByOther(task.id)}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {data?.meta?.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-200 pt-4 text-xs text-zinc-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-zinc-800">
              {(data.meta.page - 1) * data.meta.limit + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-zinc-800">
              {Math.min(data.meta.page * data.meta.limit, data.meta.total)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-zinc-800">
              {data.meta.total}
            </span>{' '}
            tasks
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={data.meta.page <= 1 || isLoading}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <span className="px-2">
              Page {data.meta.page} of {data.meta.totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
              disabled={data.meta.page >= data.meta.totalPages || isLoading}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Form Dialog (Create / Edit) */}
      <TaskFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTask(null);
        }}
        workspaceId={workspaceId}
        task={editingTask}
        onSaved={handleTaskSaved}
        acquireLock={acquireLock}
        releaseLock={releaseLock}
      />

      {/* Delete Dialog */}
      <TaskDeleteDialog
        isOpen={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        workspaceId={workspaceId}
        task={deletingTask}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
