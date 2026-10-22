'use client';

import React, { useState, useEffect } from 'react';
import { UserPlus, Users, AlertCircle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { membersApi } from '../api/members-api';
import { WorkspaceMember } from '../types';
import { WorkspaceRole } from '@/features/workspaces/types';
import { AddMemberDialog } from './add-member-dialog';
import { formatDate } from '@/lib/utils';
import { getErrorMessage } from '@/lib/api-client';

interface MemberListProps {
  workspaceId: string;
  currentUserRole: WorkspaceRole;
}

export function MemberList({
  workspaceId,
  currentUserRole,
}: MemberListProps) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const canAddMembers =
    currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  useEffect(() => {
    let isMounted = true;
    membersApi
      .listMembers(workspaceId)
      .then((data) => {
        if (isMounted) {
          setMembers(data);
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
  }, [workspaceId]);

  const handleMemberAdded = (newMember: WorkspaceMember) => {
    setMembers((prev) => [...prev, newMember]);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-zinc-500" />
            Workspace Members
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Manage who has access to this workspace and review their assigned roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canAddMembers ? (
            <Button
              onClick={() => setIsAddOpen(true)}
              className="w-full sm:w-auto"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-100 px-3 py-2 rounded-lg border border-zinc-200">
              <Shield className="w-4 h-4 text-zinc-400" />
              Only Owners and Admins can add members
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Member Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-zinc-900">
              No members found
            </h3>
            <p className="text-sm text-zinc-500 mt-1">
              Add registered users to start collaborating.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-6">User</th>
                  <th className="py-3 px-6">Email</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-zinc-50/70 transition-colors"
                  >
                    <td className="py-4 px-6 font-medium text-zinc-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {(member.user.name || member.user.email)
                            .charAt(0)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div>{member.user.name || 'Unnamed User'}</div>
                          <div className="text-xs text-zinc-400 font-mono sm:hidden">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-zinc-600 font-mono text-xs">
                      {member.user.email}
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          member.role.toLowerCase() as
                            | 'owner'
                            | 'admin'
                            | 'member'
                        }
                      >
                        {member.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-6 text-zinc-500 text-xs">
                      {formatDate(member.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddMemberDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        workspaceId={workspaceId}
        currentUserRole={currentUserRole}
        onMemberAdded={handleMemberAdded}
      />
    </div>
  );
}
