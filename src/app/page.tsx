'use client';

import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useUser } from '@/firebase';
import { HomePage as FullHomePage } from '@/components/app/HomePage';
import { Loader2 } from 'lucide-react';
import { UserRole } from '@/lib/types';

export default function Home() {
  const { user, loading, role } = useUser();
  useAuthRedirect();

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return <FullHomePage userRole={role ?? 'User'} />;
}
