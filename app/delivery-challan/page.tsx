'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import DcManager from '@/components/DcManager';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const validStatuses = ['Draft', 'Printed', 'Dispatched', 'Delivered'];
const statusTabs = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'Draft' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'Delivered', value: 'Delivered' }
];

export default function DeliveryChallanPage() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status') || '';

  const activeTabLabel = useMemo(
    () => statusTabs.find((tab) => tab.value === statusParam)?.label ?? 'All',
    [statusParam]
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
          
          <nav className="indent-status-tabs" aria-label="DC status tabs">
            {statusTabs.map((tab) => (
              <Link
                key={tab.value}
                href={`/delivery-challan${tab.value ? `?status=${tab.value}` : ''}`}
                className={`indent-status-tab${statusParam === tab.value ? ' active' : ''}`}
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
