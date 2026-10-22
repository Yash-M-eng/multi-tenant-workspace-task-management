'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { workspacesApi } from '../api/workspaces-api';
import { Workspace } from '../types';
import { getErrorMessage } from '@/lib/api-client';

const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be under 100 characters')
    .transform((v) => v.trim()),
});

type FormData = z.infer<typeof createWorkspaceSchema>;

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (workspace: Workspace) => void;
}

export function CreateWorkspaceDialog({
  isOpen,
  onClose,
  onCreated,
}: CreateWorkspaceDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: { name: '' },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const workspace = await workspacesApi.create({ name: data.name });
      reset();
      onCreated(workspace);
      onClose();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const handleClose = () => {
    reset();
    setServerError(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Workspace"
      description="Workspaces isolate tasks, settings, and team members."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Workspace Name"
          placeholder="e.g. Engineering, Product Launch"
          error={errors.name?.message}
          {...register('name')}
        />

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
            Create Workspace
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
