import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/hooks/use-auth';

export const metadata: Metadata = {
  title: 'TaskHQ - Enterprise Task Management',
  description:
    'Multi-tenant task management with real-time editing locks and workspace member management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-zinc-50 antialiased">
      <body className="min-h-full flex flex-col font-sans text-zinc-900 bg-zinc-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
