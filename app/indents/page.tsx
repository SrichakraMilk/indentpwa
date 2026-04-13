'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import IndentManager from '@/components/IndentManager';
import { useAuth } from '@/components/AuthProvider';
import { IndentStatus } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useState } from 'react';
import dynamic from 'next/dynamic';
const NewIndentModal = dynamic(() => import('@/components/NewIndentModal'), { ssr: false });

const validStatuses: IndentStatus[] = ['pending', 'approved', 'rejected', 'fulfilled'];
const statusTabs: Array<{ label: string; value: IndentStatus }> = [
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Fulfilled', value: 'fulfilled' }
];



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
    return 'pending';
  }, [statusParam]);
  const activeTabLabel = useMemo(
    () => statusTabs.find((tab) => tab.value === filterStatus)?.label ?? 'Pending',
    [filterStatus]
  );

  const role =
    agent?.role && typeof agent.role === 'object' ? (agent.role as { name?: string; code?: string }) : undefined;
  const roleName = role?.name ?? role?.code ?? '';
  const isAgent = roleName === 'Agent' || roleName === 'AGT';

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
        <p className="module-back-nav">
          <Link href="/dashboard">← Dashboard</Link>
        </p>
        <div className="indents-header-row">
          <h1 className="page-title">{activeTabLabel} Indents</h1>
          {isAgent && (
            <button className="create-indent-btn" onClick={() => setModalOpen(true)}>
              + Create New Indent
            </button>
          )}
        </div>
        <nav className="indent-status-tabs" aria-label="Indent status tabs">
          {statusTabs.map((tab) => (
            <Link
              key={tab.value}
              href={`/indents?status=${tab.value}`}
              className={`indent-status-tab${filterStatus === tab.value ? ' active' : ''}`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <NewIndentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onCreated={() => setRefreshKey((key) => key + 1)}
        />
        <IndentManager filterStatus={filterStatus} viewOnly={isAgent} refreshKey={refreshKey} />
        </main>
        <Footer/>
      </div>
    </ProtectedPage>
  );
}
