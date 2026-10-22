'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckSquare, Users, Layers } from 'lucide-react';
import { WorkspaceSelector } from './workspace-selector';
import { cn } from '@/lib/utils';

interface SidebarProps {
  workspaceId?: string;
  className?: string;
  onNavigate?: () => void;
}

export function Sidebar({ workspaceId, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  const activeWorkspaceId =
    workspaceId || pathname.match(/\/workspaces\/([^/]+)/)?.[1];

  const navItems = [
    {
      name: 'Tasks',
      href: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/tasks` : '#',
      icon: CheckSquare,
      active: pathname.includes('/tasks'),
    },
    {
      name: 'Members',
      href: activeWorkspaceId ? `/workspaces/${activeWorkspaceId}/members` : '#',
      icon: Users,
      active: pathname.includes('/members'),
    },
  ];

  return (
    <aside
      className={cn(
        'w-64 bg-white border-r border-zinc-200 flex flex-col justify-between h-full select-none',
        className,
      )}
    >
      <div className="p-4 space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-900 tracking-tight leading-none">
              TaskHQ
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">Enterprise</p>
          </div>
        </div>

        {/* Workspace Switcher */}
        <WorkspaceSelector currentWorkspaceId={activeWorkspaceId} />

        {/* Navigation */}
        <nav className="space-y-1">
          <div className="px-2 pb-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                  item.active
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100',
                  !activeWorkspaceId && 'opacity-50 pointer-events-none',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    item.active ? 'text-emerald-600' : 'text-zinc-400',
                  )}
                />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-100 text-[11px] text-zinc-400 text-center">
        Real-time Collaborative Tasks
      </div>
    </aside>
  );
}
