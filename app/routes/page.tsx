'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesApi, linkedEntityId, type SalesRouteRow } from '@/lib/api';

export default function RoutesPage() {
  const { token, agent, initializing } = useAuth();
  const [rows, setRows] = useState<SalesRouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterOptions = useMemo(() => {
    const plantId = agent ? linkedEntityId(agent.plant) : undefined;
    const branchId = agent ? linkedEntityId(agent.branch) : undefined;
    return { plantId, branchId };
  }, [agent]);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (filterOptions.plantId) parts.push(`plant ${filterOptions.plantId}`);
    if (filterOptions.branchId) parts.push(`branch ${filterOptions.branchId}`);
    return parts.length ? `Filtered by ${parts.join(', ')}.` : 'Showing all active routes.';
  }, [filterOptions]);

  const load = useCallback(async () => {
    if (!token) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hasFilter = Boolean(filterOptions.plantId || filterOptions.branchId);
      const data = await fetchRoutesApi(hasFilter ? filterOptions : undefined, token);
      setRows(data);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : 'Could not load routes.');
    } finally {
      setLoading(false);
    }
  }, [token, filterOptions]);

  useEffect(() => {
    if (initializing) return;
    void load();
  }, [initializing, load]);

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <h1 className="page-title">Routes</h1>
          <p className="module-description">{filterSummary}</p>

          {error ? (
            <div className="routes-banner routes-banner--error" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="routes-muted">Loading routes…</p>
          ) : rows.length === 0 ? (
            <p className="routes-muted">No routes to display.</p>
          ) : (
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Plant</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Executive</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="routes-table-mono">{r.code}</td>
                      <td>
                        <span className="routes-name">{r.name}</span>
                        {r.description ? (
                          <span className="routes-desc">{r.description}</span>
                        ) : null}
                      </td>
                      <td>{r.plantLabel ?? '—'}</td>
                      <td>{r.branchLabel ?? '—'}</td>
                      <td>{r.executiveLabel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 ? (
            <p className="routes-footnote">
              {rows.length} route{rows.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
