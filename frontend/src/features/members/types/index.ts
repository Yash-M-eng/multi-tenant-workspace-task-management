import { WorkspaceRole } from '@/features/workspaces/types';

export interface MemberUser {
  id: string;
  email: string;
  name: string | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  createdAt: string;
  user: MemberUser;
}

export interface AddMemberDto {
  email: string;
  role: 'ADMIN' | 'MEMBER';
}
