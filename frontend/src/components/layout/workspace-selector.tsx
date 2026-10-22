'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronDown,
  Plus,
  Briefcase,
  Check,
} from 'lucide-react';
import { Workspace } from '@/features/workspaces/types';
import { workspacesApi } from '@/features/workspaces/api/workspaces-api';
import { CreateWorkspaceDialog } from '@/features/workspaces/components/create-workspace-dialog';
import { Badge } from '@/components/ui/badge';

interface WorkspaceSelectorProps {
  currentWorkspaceId?: string;
}

export function WorkspaceSelector({
  currentWorkspaceId,
}: WorkspaceSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const activeWorkspaceId =
    currentWorkspaceId || pathname.match(/\/workspaces\/([^/]+)/)?.[1];

  useEffect(() => {
    workspacesApi
      .list()
      .then((list) => {
        setWorkspaces(list);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleSelect = (workspace: Workspace) => {
    setIsOpen(false);
    const targetTab = pathname.includes('/members') ? 'members' : 'tasks';
    router.push(`/workspaces/${workspace.id}/${targetTab}`);
  };

  const handleCreated = (newWorkspace: Workspace) => {
    setWorkspaces((prev) => [newWorkspace, ...prev]);
    router.push(`/workspaces/${newWorkspace.id}/tasks`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 transition-colors shadow-2xs text-left cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-900 truncate">
              {currentWorkspace ? currentWorkspace.name : 'Select Workspace'}
            </p>
            {currentWorkspace && (
              <span className="text-[10px] text-zinc-400 font-medium">
                {currentWorkspace.role}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0 ml-2" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 right-0 mt-1.5 z-30 bg-white border border-zinc-200 rounded-xl shadow-lg py-1.5 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Workspaces
            </div>

            <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100">
              {workspaces.map((ws) => {
                const isSelected = ws.id === activeWorkspaceId;
                return (
                  <button
                    key={ws.id}
                    onClick={() => handleSelect(ws)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-zinc-50 transition-colors text-left cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-medium text-zinc-800 truncate">
                        {ws.name}
                      </div>
                      <Badge
                        size="sm"
                        variant={ws.role.toLowerCase() as 'owner' | 'admin' | 'member'}
                      >
                        {ws.role}
                      </Badge>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-zinc-100 px-1.5">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Create New Workspace
              </button>
            </div>
          </div>
        </>
      )}

      <CreateWorkspaceDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
