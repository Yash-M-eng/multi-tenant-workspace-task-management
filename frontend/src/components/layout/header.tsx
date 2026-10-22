'use client';

import React from 'react';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 text-zinc-500 hover:text-zinc-900 lg:hidden rounded-lg hover:bg-zinc-100"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-zinc-900">
                {user.name || 'User'}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">
                {user.email}
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant="ghost"
          onClick={logout}
          title="Sign out"
          className="text-zinc-500 hover:text-rose-600 hover:bg-rose-50"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
