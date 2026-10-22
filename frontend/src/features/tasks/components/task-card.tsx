'use client';

import React from 'react';
import { Task, TaskLock } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { Edit2, Trash2, Lock } from 'lucide-react';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  lock?: TaskLock | null;
  isLockedByOther: boolean;
}

export function TaskCard({
  task,
  onEdit,
  onDelete,
  lock,
  isLockedByOther,
}: TaskCardProps) {
  const statusVariant = task.status.toLowerCase() as
    | 'todo'
    | 'in_progress'
    | 'done';
  const priorityVariant = task.priority.toLowerCase() as
    | 'low'
    | 'medium'
    | 'high';

  return (
    <div
      className={`relative bg-white border rounded-xl p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between gap-4 ${
        isLockedByOther ? 'border-amber-300 ring-1 ring-amber-300/40 bg-amber-50/20' : 'border-zinc-200'
      }`}
    >
      <div className="space-y-3">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant={statusVariant}>{task.status.replace('_', ' ')}</Badge>
            <Badge variant={priorityVariant}>{task.priority}</Badge>
            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
              v{task.version}
            </span>
          </div>

          {isLockedByOther && lock && (
            <Badge variant="lock" size="sm" className="gap-1">
              <Lock className="w-3 h-3 text-rose-600" />
              <span>Editing: {lock.name || lock.email}</span>
            </Badge>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-zinc-900 leading-snug break-words">
          {task.title}
        </h3>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed break-words">
            {task.description}
          </p>
        )}
      </div>

      {/* Footer Details & Actions */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <div className="flex items-center gap-2 truncate">
          <div className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 font-medium flex items-center justify-center text-[10px] shrink-0">
            {(task.createdBy?.name || task.createdBy?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="truncate">{task.createdBy?.name || task.createdBy?.email || 'Unknown'}</span>
          <span>•</span>
          <span className="shrink-0">{formatDate(task.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(task)}
            title={isLockedByOther ? 'Task is being edited' : 'Edit task'}
            className="p-1.5 h-8 w-8 text-zinc-500 hover:text-zinc-900"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task)}
            title="Delete task"
            className="p-1.5 h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
