'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Workspace } from '@/features/workspaces/types';
import { workspacesApi } from '@/features/workspaces/api/workspaces-api';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaceId: string;
  role: Workspace['role'];
  isLoading: boolean;
  refreshWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function WorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const workspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1] || '';
  const router = useRouter();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const data = await workspacesApi.get(workspaceId);
      setWorkspace(data);
    } catch {
      router.replace('/workspaces');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, router]);

  useEffect(() => {
    let isMounted = true;
    if (workspaceId) {
      workspacesApi
        .get(workspaceId)
        .then((data) => {
          if (isMounted) {
            setWorkspace(data);
            setIsLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) {
            router.replace('/workspaces');
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [workspaceId, router]);

  if (isLoading || !workspace) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaceId,
        role: workspace.role,
        isLoading,
        refreshWorkspace: loadWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useCurrentWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error(
      'useCurrentWorkspace must be used within a WorkspaceProvider',
    );
  }
  return context;
}
