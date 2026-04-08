'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchDashboard } from '@/lib/api';
import ProtectedPage from '@/components/ProtectedPage';
import Layout from '@/components/Layout';

export default function DashboardPage() {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const data = await fetchDashboard();
      setStats(data);
      setLoading(false);
    }

    loadStats();
  }, []);

  return (
    <ProtectedPage>
      <Layout title="Dashboard">
        <section className="dashboard-grid">
          <Link href="/indents?status=pending" className="stat-card card-link">
            <h2>Pending</h2>
            <p>{loading ? '…' : stats.pending}</p>
          </Link>
          <Link href="/indents?status=approved" className="stat-card card-link">
            <h2>Approved</h2>
            <p>{loading ? '…' : stats.approved}</p>
          </Link>
          <Link href="/indents?status=rejected" className="stat-card card-link">
            <h2>Rejected</h2>
            <p>{loading ? '…' : stats.rejected}</p>
          </Link>
          <article className="stat-card highlight">
            <h2>Total Indents</h2>
            <p>{loading ? '…' : stats.total}</p>
          </article>
        </section>

        <section className="dashboard-actions">
          <h3>Next steps</h3>
          <ul>
            <li>Click any status card to open that filtered indent list.</li>
            <li>Agent users have view-only access in the indent manager.</li>
            <li>Replace the mock API with your backend endpoints once ready.</li>
          </ul>
        </section>
      </Layout>
    </ProtectedPage>
  );
}
