'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import { fetchRoutesApi, fetchIndentsApi, linkedEntityId, type SalesRouteRow, type IndentRecord } from '@/lib/api';
import dynamic from 'next/dynamic';

const RouteIndentSheet = dynamic(() => import('@/components/RouteIndentSheet'), { ssr: false });

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
    if (!token) { setRows([]); setLoading(false); return; }
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

  // ── Sheet state ──────────────────────────────────────────
  const [sheetRoute, setSheetRoute] = useState<SalesRouteRow | null>(null);
  const [sheetIndents, setSheetIndents] = useState<IndentRecord[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const openSheet = async (route: SalesRouteRow) => {
    setSheetRoute(route);
    setSheetIndents([]);
    setSheetLoading(true);
    try {
      const indents = await fetchIndentsApi({ route: route.id, date: selectedDate }, token);
      setSheetIndents(indents);
    } catch (err) {
      console.error('Failed to fetch indents for route:', route.id, err);
    } finally {
      setSheetLoading(false);
    }
  };

  const displayDate = new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <div className="flex justify-between items-center" style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1 className="page-title">Routes</h1>
              <p className="module-description" style={{ marginTop: '4px' }}>{filterSummary}</p>
            </div>
            <div>
              <label htmlFor="route-date" style={{ marginRight: '8px', fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>Date:</label>
              <input
                id="route-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  color: '#1f2937'
                }}
              />
            </div>
          </div>

          {error ? (
            <div className="routes-banner routes-banner--error" role="alert" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="welcome-card" style={{ padding: '40px', textAlign: 'center' }}>
               <p className="routes-muted">Loading routes list...</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="welcome-card" style={{ padding: '40px', textAlign: 'center' }}>
               <p className="routes-muted">No routes found for your jurisdiction.</p>
            </div>
          ) : (
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th scope="col">Code</th>
                    <th scope="col">Name</th>
                    <th scope="col">Branch</th>
                    <th scope="col">Executive</th>
                    <th scope="col" style={{ textAlign: 'center' }}>Action</th>
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
                      <td>{r.branchLabel ?? '—'}</td>
                      <td>{r.executiveLabel ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => openSheet(r)}
                          className="pill status-pending"
                          style={{ border: 'none', cursor: 'pointer', minWidth: '100px' }}
                        >
                          View Indents
                        </button>
                      </td>
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

      {/* Full-screen indent sheet modal */}
      {sheetRoute && (
        <RouteIndentSheet
          routeName={sheetRoute.name}
          routeCode={sheetRoute.code}
          date={displayDate}
          indents={sheetLoading ? [] : sheetIndents}
          onClose={() => { setSheetRoute(null); setSheetIndents([]); }}
        />
      )}
      {sheetLoading && sheetRoute && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 5001,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '32px 48px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#1e3a8a' }}>Loading indents…</p>
            <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '13px' }}>{sheetRoute.name}</p>
          </div>
        </div>
      )}
    </ProtectedPage>
  );
}
