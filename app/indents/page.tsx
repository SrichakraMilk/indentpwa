'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedPage from '@/components/ProtectedPage';
import Layout from '@/components/Layout';
import IndentManager from '@/components/IndentManager';
import { useAuth } from '@/components/AuthProvider';
import { IndentStatus } from '@/lib/api';

const validStatuses: IndentStatus[] = ['pending', 'approved', 'rejected'];

export default function IndentsPage() {
  const searchParams = useSearchParams();
  const { agent } = useAuth();
  const statusParam = searchParams.get('status');

  const filterStatus = useMemo<IndentStatus | undefined>(() => {
    if (statusParam && validStatuses.includes(statusParam as IndentStatus)) {
      return statusParam as IndentStatus;
    }
    return undefined;
  }, [statusParam]);

  const roleName = (agent?.role as any)?.name ?? (agent?.role as any)?.code ?? '';
  const viewOnly = roleName === 'Agent' || roleName === 'AGT';

  return (
    <ProtectedPage>
      <Layout title="Indent Management">
        <IndentManager filterStatus={filterStatus} viewOnly={viewOnly} />
      </Layout>
    </ProtectedPage>
  );
}
