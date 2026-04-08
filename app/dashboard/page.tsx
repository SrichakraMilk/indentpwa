'use client';

import { useEffect, useState } from 'react';
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
          <article className="stat-card">
            <h2>Pending</h2>
            <p>{loading ? '…' : stats.pending}</p>
          </article>
          <article className="stat-card">
            <h2>Approved</h2>
            <p>{loading ? '…' : stats.approved}</p>
          </article>
          <article className="stat-card">
            <h2>Rejected</h2>
            <p>{loading ? '…' : stats.rejected}</p>
          </article>
          <article className="stat-card highlight">
            <h2>Total Indents</h2>
            <p>{loading ? '…' : stats.total}</p>
          </article>
        </section>

        <section className="dashboard-actions">
          <h3>Next steps</h3>
          <ul>
            <li>Review your current indents.</li>
            <li>Open the indent manager to create, update, or delete indents.</li>
            <li>Replace the mock API with your backend endpoints once ready.</li>
          </ul>
        </section>
      </Layout>
    </ProtectedPage>
  );
}
