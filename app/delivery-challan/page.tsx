'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import { useAuth } from '@/components/AuthProvider';
import DcManager from '@/components/DcManager';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const validStatuses = ['Draft', 'In Progress', 'Security Check', 'Dispatched', 'Delivered'];

const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Loading', value: 'In Progress' },
  { label: 'Dispatched', value: 'Security Check,Dispatched' },
  { label: 'Delivered', value: 'Delivered' }
];

export default function DeliveryChallanPage() {
  const { agent } = useAuth();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') || '';

  const roleCode = (agent?.role as any)?.code?.toUpperCase() || "";
  const isSecurity = roleCode === 'SEC' || roleCode === 'SECURITY';
  const isLogistics = ['DS', 'SEC', 'SUP'].includes(roleCode);

  const myTabs = isSecurity ? [
    { label: 'All', value: '' },
    { label: 'Security', value: 'Security Check' },
    { label: 'Approved', value: 'Approved' },
  ] : statusTabs;

  const activeTabLabel = useMemo(
    () => myTabs.find((tab) => tab.value === statusParam)?.label ?? 'All',
    [statusParam, myTabs]
  );

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>

          <div className="indents-header-row">
            <h1 className="page-title">{activeTabLabel} Delivery Challans</h1>
          </div>

          <nav className="indent-status-tabs">
            {myTabs.map((tab) => (
              <Link
                key={tab.value}
                href={`/delivery-challan${tab.value ? `?status=${tab.value}` : ''}`}
                className={`indent-status-tab ${statusParam === tab.value ? 'active' : ''}`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <DcManager status={statusParam} />
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
