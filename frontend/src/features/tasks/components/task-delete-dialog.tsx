'use client';

import React, { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { tasksApi } from '../api/tasks-api';
import { Task } from '../types';
import { getErrorMessage } from '@/lib/api-client';
import { AlertTriangle } from 'lucide-react';

interface TaskDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  task: Task | null;
  onDeleted: (taskId: string) => void;
}

export function TaskDeleteDialog({
  isOpen,
  onClose,
  workspaceId,
  task,
  onDeleted,
}: TaskDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await tasksApi.delete(workspaceId, task.id);
      onDeleted(task.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Task"
      description="This action cannot be undone."
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-800">
            Are you sure you want to delete{' '}
            <strong className="font-semibold text-rose-950">
              &quot;{task.title}&quot;
            </strong>
            ? This will permanently remove the task from the workspace.
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleDelete}
            isLoading={isDeleting}
          >
            Delete Task
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
