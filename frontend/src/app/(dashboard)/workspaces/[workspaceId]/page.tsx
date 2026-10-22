'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function WorkspaceIndexPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const workspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1];
    if (workspaceId) {
      router.replace(`/workspaces/${workspaceId}/tasks`);
    }
  }, [pathname, router]);

  return null;
}
