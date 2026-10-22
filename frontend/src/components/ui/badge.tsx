import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | 'default'
    | 'todo'
    | 'in_progress'
    | 'done'
    | 'low'
    | 'medium'
    | 'high'
    | 'owner'
    | 'admin'
    | 'member'
    | 'lock';
  size?: 'sm' | 'md';
}

export function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  const base =
    'inline-flex items-center font-medium rounded-full tracking-wide transition-colors';

  const variants = {
    default: 'bg-zinc-100 text-zinc-700 border border-zinc-200',
    // Status
    todo: 'bg-zinc-100 text-zinc-700 border border-zinc-300',
    in_progress: 'bg-blue-50 text-blue-700 border border-blue-200',
    done: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    // Priority
    low: 'bg-slate-100 text-slate-600 border border-slate-200',
    medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    high: 'bg-rose-50 text-rose-700 border border-rose-200',
    // Roles
    owner: 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold',
    admin: 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold',
    member: 'bg-zinc-100 text-zinc-600 border border-zinc-200',
    // Realtime Lock
    lock: 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse font-medium',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </span>
  );
}
