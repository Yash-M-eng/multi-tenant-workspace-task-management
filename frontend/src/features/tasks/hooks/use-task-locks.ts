'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import { TaskLock } from '../types';
import { useAuth } from '@/features/auth/hooks/use-auth';

interface LockRejection {
  taskId: string;
  lockedBy: {
    userId: string;
    name: string;
    email: string;
  };
  message: string;
}

export function useTaskLocks(workspaceId: string) {
  const { user, token } = useAuth();
  const [locks, setLocks] = useState<Record<string, TaskLock>>({});
  const pendingLockPromises = useRef<
    Map<
      string,
      {
        resolve: (acquired: boolean) => void;
        rejectReason: (error: LockRejection) => void;
      }
    >
  >(new Map());

  useEffect(() => {
    if (!token || !workspaceId) return;

    const socket = getSocket(token);

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit('join:workspace', { workspaceId });

    const handleInitialLocks = (activeLocks: TaskLock[]) => {
      const lockMap: Record<string, TaskLock> = {};
      activeLocks.forEach((l) => {
        lockMap[l.taskId] = l;
      });
      setLocks(lockMap);
    };

    const handleTaskLocked = (lock: TaskLock) => {
      if (lock.workspaceId === workspaceId) {
        setLocks((prev) => ({
          ...prev,
          [lock.taskId]: lock,
        }));

        // Resolve pending acquire promise if it was this user
        const pending = pendingLockPromises.current.get(lock.taskId);
        if (pending) {
          pending.resolve(true);
          pendingLockPromises.current.delete(lock.taskId);
        }
      }
    };

    const handleTaskUnlocked = (data: { taskId: string; workspaceId: string }) => {
      if (data.workspaceId === workspaceId) {
        setLocks((prev) => {
          const next = { ...prev };
          delete next[data.taskId];
          return next;
        });
      }
    };

    const handleLockRejected = (rejection: LockRejection) => {
      const pending = pendingLockPromises.current.get(rejection.taskId);
      if (pending) {
        pending.rejectReason(rejection);
        pendingLockPromises.current.delete(rejection.taskId);
      }
    };

    socket.on('locks:current', handleInitialLocks);
    socket.on('task:locked', handleTaskLocked);
    socket.on('task:unlocked', handleTaskUnlocked);
    socket.on('task:lock:rejected', handleLockRejected);

    return () => {
      socket.emit('leave:workspace', { workspaceId });
      socket.off('locks:current', handleInitialLocks);
      socket.off('task:locked', handleTaskLocked);
      socket.off('task:unlocked', handleTaskUnlocked);
      socket.off('task:lock:rejected', handleLockRejected);
    };
  }, [workspaceId, token]);

  const acquireLock = useCallback(
    (taskId: string): Promise<{ success: boolean; rejection?: LockRejection }> => {
      if (!token) {
        return Promise.resolve({ success: false });
      }

      const socket = getSocket(token);

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          pendingLockPromises.current.delete(taskId);
          resolve({ success: true }); // Fallback on timeout to avoid locking user out
        }, 3000);

        pendingLockPromises.current.set(taskId, {
          resolve: () => {
            clearTimeout(timeout);
            resolve({ success: true });
          },
          rejectReason: (rejection) => {
            clearTimeout(timeout);
            resolve({ success: false, rejection });
          },
        });

        socket.emit('task:lock:acquire', { taskId, workspaceId });
      });
    },
    [workspaceId, token],
  );

  const releaseLock = useCallback(
    (taskId: string) => {
      if (!token) return;
      const socket = getSocket(token);
      socket.emit('task:lock:release', { taskId, workspaceId });
    },
    [workspaceId, token],
  );

  const isTaskLockedByOther = useCallback(
    (taskId: string): boolean => {
      const lock = locks[taskId];
      if (!lock) return false;
      if (lock.expiresAt < Date.now()) return false;
      return lock.userId !== user?.id;
    },
    [locks, user?.id],
  );

  const getLockHolder = useCallback(
    (taskId: string): TaskLock | null => {
      const lock = locks[taskId];
      if (!lock) return null;
      if (lock.expiresAt < Date.now()) return null;
      return lock;
    },
    [locks],
  );

  return {
    locks,
    acquireLock,
    releaseLock,
    isTaskLockedByOther,
    getLockHolder,
  };
}
