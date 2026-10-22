'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { membersApi } from '../api/members-api';
import { WorkspaceMember } from '../types';
import { WorkspaceRole } from '@/features/workspaces/types';
import { getErrorMessage } from '@/lib/api-client';

const addMemberSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .transform((v) => v.trim().toLowerCase()),
  role: z.enum(['ADMIN', 'MEMBER']),
});

type FormData = z.infer<typeof addMemberSchema>;

interface AddMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  currentUserRole: WorkspaceRole;
  onMemberAdded: (member: WorkspaceMember) => void;
}

export function AddMemberDialog({
  isOpen,
  onClose,
  workspaceId,
  currentUserRole,
  onMemberAdded,
}: AddMemberDialogProps) {
  const [serverError, setServerError] = useState<string | null>(null);

  const availableRoles: Array<{ value: 'ADMIN' | 'MEMBER'; label: string }> =
    currentUserRole === 'OWNER'
      ? [
          { value: 'MEMBER', label: 'Member - Can view and manage tasks' },
          { value: 'ADMIN', label: 'Admin - Can manage members and tasks' },
        ]
      : [{ value: 'MEMBER', label: 'Member - Can view and manage tasks' }];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
    },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const newMember = await membersApi.addMember(workspaceId, {
        email: data.email,
        role: data.role,
      });
      reset();
      onMemberAdded(newMember);
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
      title="Add Team Member"
      description="Add an existing registered user to this workspace by email."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
            {serverError}
          </div>
        )}

        <Input
          label="Registered User Email"
          type="email"
          placeholder="colleague@example.com"
          error={errors.email?.message}
          helperText="The user must already have registered an account."
          {...register('email')}
        />

        <Select
          label="Workspace Role"
          error={errors.role?.message}
          options={availableRoles}
          {...register('role')}
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
            Add Member
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
