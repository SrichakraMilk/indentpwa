'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedPage from '@/components/ProtectedPage';
import IndentManager from '@/components/IndentManager';
import { useAuth } from '@/components/AuthProvider';
import { IndentStatus } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const NewIndentModal = dynamic(() => import('@/components/NewIndentModal'), { ssr: false });

const validStatuses: IndentStatus[] = ['pending', 'approved', 'rejected'];



export default function IndentsPage() {
  const searchParams = useSearchParams();
  const { agent } = useAuth();
  const statusParam = searchParams.get('status');
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filterStatus = useMemo<IndentStatus | undefined>(() => {
    if (statusParam && validStatuses.includes(statusParam as IndentStatus)) {
      return statusParam as IndentStatus;
    }
    return undefined;
  }, [statusParam]);

  const role =
    agent?.role && typeof agent.role === 'object' ? (agent.role as { name?: string; code?: string }) : undefined;
  const roleName = role?.name ?? role?.code ?? '';
  const viewOnly = roleName === 'Agent' || roleName === 'AGT';

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
        <h1 className="page-title">Indents</h1>
        <div className="indents-toolbar">
          <button className="create-indent-btn" onClick={() => setModalOpen(true)}>
            + Create New Indent
          </button>
        </div>
        <NewIndentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => setRefreshKey((key) => key + 1)}
        />
        <IndentManager filterStatus={filterStatus} viewOnly={viewOnly} refreshKey={refreshKey} />
        </main>
        <Footer/>
      </div>
    </ProtectedPage>
  );
}
