'use client';

import React from 'react';
import { useCurrentWorkspace } from '../workspace-context';
import { MemberList } from '@/features/members/components/member-list';

export default function WorkspaceMembersPage() {
  const { workspaceId, role } = useCurrentWorkspace();

  return <MemberList workspaceId={workspaceId} currentUserRole={role} />;
}
