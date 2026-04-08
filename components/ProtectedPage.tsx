'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function ProtectedPage({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, initializing } = useAuth();

  useEffect(() => {
    if (!initializing && user === null) {
      router.replace('/login');
    }
  }, [router, user, initializing]);

  if (initializing) {
    return <div className="page-shell"><div className="card">Checking session…</div></div>;
  }

  if (!user) {
    return <div className="page-shell"><div className="card">Redirecting to login…</div></div>;
  }

  return <>{children}</>;
}
