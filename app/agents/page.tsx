'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedPage from '@/components/ProtectedPage';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/components/AuthProvider';
import {
  fetchRoutesApi,
  fetchAgentsForRouteApi,
  linkedEntityId,
  type ListedAgent,
  type SalesRouteRow
} from '@/lib/api';

export default function AgentsPage() {
  const { token, agent, initializing } = useAuth();
  const [routes, setRoutes] = useState<SalesRouteRow[]>([]);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [routesLoading, setRoutesLoading] = useState(true);

  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [agents, setAgents] = useState<ListedAgent[]>([]);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);

  const defaultRouteId = useMemo(() => linkedEntityId(agent?.route), [agent]);

  const routeFilterOptions = useMemo(() => {
    const plantId = agent ? linkedEntityId(agent.plant) : undefined;
    const branchId = agent ? linkedEntityId(agent.branch) : undefined;
    return { plantId, branchId };
  }, [agent]);

  const loadRoutes = useCallback(async () => {
    if (!token) {
      setRoutes([]);
      setRoutesLoading(false);
      return;
    }
    setRoutesLoading(true);
    setRoutesError(null);
    try {
      const hasFilter = Boolean(routeFilterOptions.plantId || routeFilterOptions.branchId);
      const data = await fetchRoutesApi(hasFilter ? routeFilterOptions : undefined, token);
      setRoutes(data);
    } catch (e) {
      setRoutes([]);
      setRoutesError(e instanceof Error ? e.message : 'Could not load routes.');
    } finally {
      setRoutesLoading(false);
    }
  }, [token, routeFilterOptions]);

  useEffect(() => {
    if (initializing) return;
    void loadRoutes();
  }, [initializing, loadRoutes]);

  useEffect(() => {
    if (!defaultRouteId || routes.length === 0) return;
    const exists = routes.some((r) => r.id === defaultRouteId);
    if (!exists) return;
    setSelectedRouteId((prev) => (prev ? prev : defaultRouteId));
  }, [defaultRouteId, routes]);

  const loadAgents = useCallback(async () => {
    if (!token || !selectedRouteId.trim()) {
      setAgents([]);
      return;
    }
    setAgentsLoading(true);
    setAgentsError(null);
    try {
      const list = await fetchAgentsForRouteApi(selectedRouteId, token);
      setAgents(list);
    } catch (e) {
      setAgents([]);
      setAgentsError(e instanceof Error ? e.message : 'Could not load agents.');
    } finally {
      setAgentsLoading(false);
    }
  }, [token, selectedRouteId]);

  useEffect(() => {
    if (initializing) return;
    if (!selectedRouteId.trim()) {
      setAgents([]);
      setAgentsError(null);
      return;
    }
    void loadAgents();
  }, [initializing, selectedRouteId, loadAgents]);

  return (
    <ProtectedPage>
      <div className="dashboard-container">
        <Header />
        <main className="page-shell">
          <p className="module-back-nav">
            <Link href="/dashboard">← Dashboard</Link>
          </p>
          <h1 className="page-title">Agents</h1>
          <p className="module-description">
            Choose a route to load agents assigned to that route.
          </p>

          {routesError ? (
            <div className="routes-banner routes-banner--error" role="alert">
              {routesError}
            </div>
          ) : null}

          <div className="agents-route-field">
            <label htmlFor="agents-route-select">Route</label>
            <select
              id="agents-route-select"
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              disabled={routesLoading || !token}
            >
              <option value="">{routesLoading ? 'Loading routes…' : 'Select a route…'}</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} — {r.name}
                </option>
              ))}
            </select>
          </div>

          {agentsError ? (
            <div className="routes-banner routes-banner--error" role="alert">
              {agentsError}
            </div>
          ) : null}

          {!selectedRouteId.trim() ? (
            <p className="routes-muted">Select a route to see agents.</p>
          ) : agentsLoading ? (
            <p className="routes-muted">Loading agents…</p>
          ) : agents.length === 0 ? (
            <p className="routes-muted">No agents for this route.</p>
          ) : (
            <div className="routes-table-wrap">
              <table className="routes-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Agent code</th>
                    <th scope="col">User ID</th>
                    <th scope="col">Mobile</th>
                    <th scope="col">Branch</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className="routes-name">{a.displayName}</span>
                        {a.email ? <span className="routes-desc">{a.email}</span> : null}
                      </td>
                      <td className="routes-table-mono">{a.agentCode ?? '—'}</td>
                      <td className="routes-table-mono">{a.userid ?? '—'}</td>
                      <td>{a.mobile ?? '—'}</td>
                      <td>{a.branchLabel ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!agentsLoading && selectedRouteId && agents.length > 0 ? (
            <p className="routes-footnote">
              {agents.length} agent{agents.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </main>
        <Footer />
      </div>
    </ProtectedPage>
  );
}
