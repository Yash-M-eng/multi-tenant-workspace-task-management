'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { workspacesApi } from '@/features/workspaces/api/workspaces-api';
import { Briefcase, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWorkspaceDialog } from '@/features/workspaces/components/create-workspace-dialog';

export default function DashboardIndexPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    workspacesApi
      .list()
      .then((data) => {
        if (!isMounted) return;
        if (data.length > 0) {
          router.replace(`/workspaces/${data[0].id}/tasks`);
        } else {
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isLoading) {
    return (
      <div className="space-y-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
        No Workspaces Yet
      </h2>
      <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
        Workspaces help you organize tasks and team members with strict tenant isolation. Create your first workspace to get started.
      </p>
      <div className="mt-6">
        <Button onClick={() => setIsCreateOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create First Workspace
        </Button>
      </div>

      <CreateWorkspaceDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(ws) => {
          router.replace(`/workspaces/${ws.id}/tasks`);
        }}
      />
    </div>
  );
}
