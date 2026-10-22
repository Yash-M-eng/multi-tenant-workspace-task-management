'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { tasksApi } from '../api/tasks-api';
import { Task, TaskPriority, TaskStatus } from '../types';
import { getErrorMessage } from '@/lib/api-client';
import { Lock, AlertCircle } from 'lucide-react';
import axios from 'axios';

const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or fewer')
    .transform((v) => v.trim()),
  description: z
    .string()
    .max(2000, 'Description must be under 2000 characters')
    .optional()
    .transform((v) => (v ? v.trim() : '')),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
});

type FormData = z.infer<typeof taskSchema>;

interface TaskFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  task?: Task | null;
  onSaved: (task: Task) => void;
  acquireLock?: (
    taskId: string,
  ) => Promise<{
    success: boolean;
    rejection?: { lockedBy: { name: string; email: string }; message: string };
  }>;
  releaseLock?: (taskId: string) => void;
}

export function TaskFormDialog({
  isOpen,
  onClose,
  workspaceId,
  task,
  onSaved,
  acquireLock,
  releaseLock,
}: TaskFormDialogProps) {
  const isEditing = !!task;
  const [serverError, setServerError] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [isAcquiringLock, setIsAcquiringLock] = useState(false);
  const [hasLock, setHasLock] = useState(!isEditing);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title || '',
      description: task?.description || '',
      status: task?.status || 'TODO',
      priority: task?.priority || 'MEDIUM',
    },
  });

  useEffect(() => {
    let isMounted = true;
    if (isOpen && isEditing && task && acquireLock) {
      acquireLock(task.id).then((result) => {
        if (!isMounted) return;
        setIsAcquiringLock(false);
        if (result.success) {
          setHasLock(true);
        } else if (result.rejection) {
          setLockError(
            `Task is currently locked by ${result.rejection.lockedBy.name || result.rejection.lockedBy.email}`,
          );
        } else {
          setLockError('Could not acquire editing lock for this task.');
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, isEditing, task, acquireLock]);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        reset({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
        });
      } else {
        reset({
          title: '',
          description: '',
          status: 'TODO',
          priority: 'MEDIUM',
        });
      }
    }
  }, [isOpen, task, reset]);

  const handleClose = () => {
    if (isEditing && task && releaseLock && hasLock) {
      releaseLock(task.id);
    }
    reset();
    setServerError(null);
    setLockError(null);
    setHasLock(false);
    onClose();
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      if (isEditing && task) {
        const updated = await tasksApi.update(
          workspaceId,
          task.id,
          {
            title: data.title,
            description: data.description || undefined,
            status: data.status as TaskStatus,
            priority: data.priority as TaskPriority,
          },
          task.version,
        );

        if (releaseLock) {
          releaseLock(task.id);
        }

        onSaved(updated);
        handleClose();
      } else {
        const created = await tasksApi.create(workspaceId, {
          title: data.title,
          description: data.description || undefined,
          status: data.status as TaskStatus,
          priority: data.priority as TaskPriority,
        });

        onSaved(created);
        handleClose();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setServerError(
          'Concurrency conflict: This task was updated by another team member. Please refresh to load the latest changes.',
        );
      } else {
        setServerError(getErrorMessage(err));
      }
    }
  };

  const statusOptions = [
    { value: 'TODO', label: 'To Do' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'DONE', label: 'Done' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'HIGH', label: 'High' },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Task' : 'Create Task'}
      description={
        isEditing
          ? `Version ${task?.version ?? 1} • Changes will be synchronized in real-time.`
          : 'Add a new task to track work in this workspace.'
      }
      maxWidth="lg"
    >
      {lockError ? (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Task is Locked
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">{lockError}</p>
              <p className="text-xs text-amber-600 mt-2">
                Real-time locks prevent conflicting edits. Try again after the editor finishes or closes the task.
              </p>
            </div>
          </div>
          <div className="flex justify-end pt-3 border-t border-zinc-100">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : isAcquiringLock ? (
        <div className="p-8 text-center text-sm text-zinc-500">
          Acquiring edit lock...
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <Input
            label="Title"
            placeholder="e.g. Design authentication workflow"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700 uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              rows={4}
              placeholder="Add additional context, acceptance criteria, or notes..."
              className="w-full px-3 py-2 text-sm text-zinc-900 bg-white border border-zinc-300 rounded-lg placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              {...register('description')}
            />
            {errors.description?.message && (
              <p className="text-xs text-rose-600 font-medium">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Status"
              error={errors.status?.message}
              options={statusOptions}
              {...register('status')}
            />

            <Select
              label="Priority"
              error={errors.priority?.message}
              options={priorityOptions}
              {...register('priority')}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
